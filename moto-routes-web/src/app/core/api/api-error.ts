import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

/*
 * Los fallos de una petición, como los ve la web pública. Es una versión corta del de el panel
 * (core/utils/api-error.mapper.ts): aquí no hay sesión ni formularios, así que no hacen falta los
 * mensajes de login, permisos o campos.
 */

export type ApiErrorType = 'network' | 'timeout' | 'notFound' | 'invalid' | 'server';

const MESSAGES: Record<ApiErrorType, string> = {
  network: 'No hemos podido conectar. Comprueba tu conexión y vuelve a intentarlo.',
  timeout: 'Está tardando demasiado en responder. Vuelve a intentarlo.',
  notFound: 'No hemos encontrado lo que buscabas. Puede que ya no esté disponible.',
  invalid: 'Esa búsqueda no se puede hacer. Quita los filtros y vuelve a intentarlo.',
  server: 'Algo ha fallado de nuestro lado. Vuelve a intentarlo en unos minutos.',
};

export class ApiError extends Error {
  /** Código HTTP. Vale 0 cuando no hubo respuesta (network y timeout). */
  readonly status: number;
  readonly type: ApiErrorType;

  constructor(type: ApiErrorType, status: number) {
    super(MESSAGES[type]);
    this.name = 'ApiError';
    this.type = type;
    this.status = status;
  }

  get isNotFound(): boolean {
    return this.type === 'notFound';
  }
}

/** Convierte cualquier fallo de una petición en un ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof TimeoutError) return new ApiError('timeout', 0);
  if (!(error instanceof HttpErrorResponse)) return new ApiError('server', 0);
  if (error.status === 0) return new ApiError('network', 0);
  if (error.status === 404) return new ApiError('notFound', 404);
  if (error.status === 400) return new ApiError('invalid', 400);
  return new ApiError('server', error.status);
}

/** Una petición abortada a propósito (AbortController): no es un error que enseñar. */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** El error que rechaza una petición abortada, igual que el de fetch. */
export function abortError(): DOMException {
  return new DOMException('La petición se ha cancelado', 'AbortError');
}
