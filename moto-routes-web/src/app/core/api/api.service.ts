import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { REQUEST_TIMEOUT } from '../interceptors/timeout.interceptor';
import { abortError } from './api-error';

/** La tienda pública de la API: /api/shop */
export const SHOP_URL = `${environment.apiUrl}/shop`;
/** Escribir opiniones (con sesión): /api/reviews */
export const REVIEWS_URL = `${environment.apiUrl}/reviews`;
/** El servidor de IA: /ai */
export const AI_URL = environment.aiUrl;

export type ApiParams = Record<string, string | number | boolean | null | undefined>;

export interface GetOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Todas las peticiones de la web pasan por aquí: los stores llaman a este servicio y los componentes
 * llaman a su store. Nunca un componente pide nada a la API.
 *
 * Devuelve promesas (await en el store) y va por HttpClient, así pasan los interceptores: la
 * sesión (authInterceptor manda las cookies y renueva si caduca) y el tiempo máximo. Un fallo
 * rechaza con el HttpErrorResponse tal cual: el store lo traduce (toApiError o su propio mensaje).
 *
 * La única petición que no va por HttpClient es la del chat (stream): responde en streaming y
 * HttpClient no deja leer la respuesta según llega.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /**
   * signal: la de un AbortController del store. Al abortarla se cancela la petición (con
   * withFetch(), el fetch de verdad) y la promesa se rechaza con un AbortError (isAbortError).
   * timeoutMs: otro tiempo máximo para esta petición (la IA tarda más).
   */
  get<T>(url: string, params: ApiParams = {}, { signal, timeoutMs }: GetOptions = {}): Promise<T> {
    const request = this.http.get<T>(url, { params: toHttpParams(params), context: withTimeout(timeoutMs) });
    return signal ? untilAborted(request, signal) : firstValueFrom(request);
  }

  post<T>(url: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(url, body));
  }

  patch<T>(url: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.patch<T>(url, body));
  }

  delete<T>(url: string): Promise<T> {
    return firstValueFrom(this.http.delete<T>(url));
  }

  /**
   * POST que responde en streaming (text/event-stream): llama a onEvent con cada evento según
   * llega y termina cuando acaba. Si no puede ni empezar, rechaza con un StreamError (status 0 si
   * no hubo respuesta). Abortar la señal corta la respuesta.
   */
  async stream<E>(url: string, body: unknown, onEvent: (event: E) => void, signal?: AbortSignal): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
      body: JSON.stringify(body),
      signal,
    }).catch((error: unknown) => {
      if (signal?.aborted) throw error;
      throw new StreamError(0);
    });
    if (!response.ok || !response.body) throw new StreamError(response.status);
    for await (const event of readEvents<E>(response.body)) onEvent(event);
  }
}

/** Un streaming que no ha podido empezar: el status de la respuesta (0, sin conexión). */
export class StreamError extends Error {
  constructor(readonly status: number) {
    super(`Stream failed (${status})`);
    this.name = 'StreamError';
  }
}

/** La primera respuesta, o un AbortError si antes se aborta la señal (y entonces se cancela). */
function untilAborted<T>(request: Observable<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const subscription = request.subscribe({
      next: (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      error: (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    });
    function onAbort(): void {
      subscription.unsubscribe();
      reject(abortError());
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

// Solo los parámetros con valor: un filtro vacío no viaja en la URL
function toHttpParams(params: ApiParams): HttpParams {
  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    httpParams = httpParams.set(key, String(value));
  }
  return httpParams;
}

const withTimeout = (timeoutMs?: number): HttpContext | undefined =>
  timeoutMs === undefined ? undefined : new HttpContext().set(REQUEST_TIMEOUT, timeoutMs);

/** Los eventos de un streaming SSE ("event: x\ndata: {...}\n\n"), según llegan: { event, data }. */
export async function* readEvents<E>(body: ReadableStream<Uint8Array>): AsyncGenerator<E> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const event = /^event: (.+)$/m.exec(block)?.[1];
        const data = /^data: (.+)$/m.exec(block)?.[1];
        if (!event || !data) continue;
        try {
          yield { event, data: JSON.parse(data) } as E;
        } catch {
          // Un evento que no es JSON: se ignora
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
