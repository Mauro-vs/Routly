import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { REQUEST_TIMEOUT } from '../interceptors/timeout.interceptor';
import { abortError, toApiError } from '../api/api-error';
import { AiInsights, AiReviewsSummary, AiRouteMap, AiStops, AiWeather, ChatEvent, ChatMessage } from './ai.models';

/** Un fallo del servidor de IA: 503 es "no hay IA configurada" (la web lo esconde sin alarmar). */
export class AiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AiError';
  }

  get unavailable(): boolean {
    return this.status === 503;
  }
}

const CHAT_MESSAGES = {
  network: 'No hemos podido conectar con el asistente. Comprueba tu conexión.',
  busy: 'Has hecho muchas preguntas seguidas. Espera un poco y vuelve a intentarlo.',
  unavailable: 'El asistente no está disponible ahora mismo.',
  failed: 'El asistente ha fallado. Vuelve a intentarlo.',
};

/**
 * Las peticiones al servidor de IA (moto-routes-ai), que va por el mismo origen en /ai, como la API
 * en /api.
 *
 * - Los GET del bloque Routly IA van por HttpClient (con su interceptor de tiempo, más largo: la
 *   IA tarda), igual que ShopApiService: devuelven promesas y aceptan un AbortSignal.
 * - El chat va por fetch, porque responde en streaming (text/event-stream) y HttpClient no deja
 *   leer la respuesta según llega.
 */
@Injectable({ providedIn: 'root' })
export class AiApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.aiUrl;

  insights(slug: string, signal?: AbortSignal): Promise<AiInsights> {
    return this.get<AiInsights>(`/experiences/${encodeURIComponent(slug)}/insights`, signal);
  }

  weather(slug: string, signal?: AbortSignal): Promise<AiWeather> {
    return this.get<AiWeather>(`/experiences/${encodeURIComponent(slug)}/weather`, signal);
  }

  stops(slug: string, signal?: AbortSignal): Promise<AiStops> {
    return this.get<AiStops>(`/experiences/${encodeURIComponent(slug)}/stops`, signal);
  }

  /** El recorrido por carretera y los restaurantes que hay a lo largo, para el mapa. */
  routeMap(slug: string, signal?: AbortSignal): Promise<AiRouteMap> {
    return this.get<AiRouteMap>(`/experiences/${encodeURIComponent(slug)}/route`, signal);
  }

  /** El resumen IA de las opiniones de una experiencia o de un guía; null si hay menos de 3 con comentario. */
  reviewsSummary(type: 'experience' | 'host', slug: string, signal?: AbortSignal): Promise<AiReviewsSummary | null> {
    const base = type === 'host' ? 'hosts' : 'experiences';
    return this.get<AiReviewsSummary | null>(`/${base}/${encodeURIComponent(slug)}/reviews-summary`, signal);
  }

  private get<T>(path: string, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) return Promise.reject(abortError());
    return new Promise<T>((resolve, reject) => {
      const onAbort = (): void => {
        subscription.unsubscribe();
        reject(abortError());
      };
      const subscription = this.http
        .get<{ data: T }>(`${this.baseUrl}${path}`, { context: new HttpContext().set(REQUEST_TIMEOUT, environment.aiTimeout) })
        .subscribe({
          next: (body) => {
            signal?.removeEventListener('abort', onAbort);
            resolve(body.data);
          },
          error: (error: unknown) => {
            signal?.removeEventListener('abort', onAbort);
            const status = error instanceof HttpErrorResponse ? error.status : 0;
            reject(new AiError(toApiError(error).message, status));
          },
        });
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  /**
   * Manda la conversación y va llamando a onEvent con cada evento del streaming (tool, delta,
   * done, error). Termina cuando acaba el streaming; si no se puede ni empezar, lanza un AiError
   * con un mensaje para enseñar. Abortar la señal corta la respuesta (y el servidor deja de pedir a
   * la IA).
   */
  async chat(
    body: { messages: ChatMessage[]; experienceSlug?: string },
    onEvent: (event: ChatEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (signal?.aborted) throw abortError();
      throw new AiError(CHAT_MESSAGES.network, 0);
    }

    if (!response.ok || !response.body) {
      const status = response.status;
      const message = status === 429 ? CHAT_MESSAGES.busy : status === 503 ? CHAT_MESSAGES.unavailable : CHAT_MESSAGES.failed;
      throw new AiError(message, status);
    }

    for await (const event of readEvents(response.body)) onEvent(event);
  }
}

/** Los eventos de un streaming SSE ("event: x\ndata: {...}\n\n"), según llegan. */
export async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<ChatEvent> {
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
          yield { event, data: JSON.parse(data) } as ChatEvent;
        } catch {
          // Un evento que no es JSON: se ignora
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
