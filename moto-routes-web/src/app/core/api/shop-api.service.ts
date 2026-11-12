import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { abortError, toApiError } from './api-error';

export type ShopParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Las peticiones a /api/shop, la tienda pública de la API (sin sesión).
 *
 * Devuelve promesas y acepta un AbortSignal: quien pide (el store del Shop) crea un
 * AbortController por petición y, al llegar una nueva, aborta la anterior. HttpClient no admite
 * una señal, así que al abortar se cancela la suscripción: con withFetch() eso aborta el fetch de
 * verdad, y la promesa se rechaza con un AbortError, que no es un fallo que enseñar.
 * Se pasa por HttpClient y no por fetch para que sigan valiendo los interceptores (el tiempo de
 * espera).
 */
@Injectable({ providedIn: 'root' })
export class ShopApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/shop`;

  get<T>(path: string, params: ShopParams = {}, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) return Promise.reject(abortError());

    return new Promise<T>((resolve, reject) => {
      const onAbort = (): void => {
        subscription.unsubscribe();
        reject(abortError());
      };
      const subscription = this.http
        .get<T>(`${this.baseUrl}${path}`, { params: toHttpParams(params) })
        .subscribe({
          next: (body) => {
            signal?.removeEventListener('abort', onAbort);
            resolve(body);
          },
          error: (error: unknown) => {
            signal?.removeEventListener('abort', onAbort);
            reject(toApiError(error));
          },
        });
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}

// Solo los parámetros con valor: un filtro vacío no viaja en la URL
function toHttpParams(params: ShopParams): HttpParams {
  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    httpParams = httpParams.set(key, String(value));
  }
  return httpParams;
}
