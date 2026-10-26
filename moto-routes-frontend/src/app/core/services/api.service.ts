import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

/** Parámetros de consulta admitidos en la URL. */
type QueryParams = Record<string, string | number | boolean>;

interface RequestOptions {
  params?: QueryParams;
  /** Datos para los interceptores, por ejemplo REQUEST_TIMEOUT. */
  context?: HttpContext;
}

/**
 * Única puerta de salida hacia la API. Los servicios de cada feature la usan en vez
 * de HttpClient, así la URL base, el tiempo de espera y el formato de los errores se
 * resuelven en un solo sitio.
 *
 * Devuelve promesas para consumirlas con async/await. Cuando una petición falla, la
 * promesa se rechaza con un ApiError (lo construye el errorInterceptor).
 *
 * Nota: la API solo admite GET, POST y PATCH por CORS. `put` y `delete` están por
 * si un endpoint futuro los necesita.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.url(path), options));
  }

  post<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.url(path), body, options));
  }

  put<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    return firstValueFrom(this.http.put<T>(this.url(path), body, options));
  }

  patch<T>(path: string, body: unknown = null, options: RequestOptions = {}): Promise<T> {
    return firstValueFrom(this.http.patch<T>(this.url(path), body, options));
  }

  delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return firstValueFrom(this.http.delete<T>(this.url(path), options));
  }

  /** Las rutas relativas cuelgan de `apiUrl`; una URL completa se respeta tal cual. */
  private url(path: string): string {
    return /^https?:\/\//.test(path) ? path : `${this.baseUrl}${path}`;
  }
}
