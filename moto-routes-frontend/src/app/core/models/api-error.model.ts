/**
 * Clase de fallo de una petición, tal como la ve el panel:
 * - network: no hubo respuesta (API parada, sin red, CORS).
 * - timeout: la respuesta no llegó dentro de `apiTimeout`.
 * - validation: 400 o 422, normalmente con errores por campo.
 * - client: el resto de 4xx (404, 409, 401, 403...).
 * - server: cualquier 5xx.
 */
export type ApiErrorType = 'network' | 'timeout' | 'validation' | 'client' | 'server';

/** Mensaje de error por nombre de campo, listo para mostrar junto al control. */
export type FieldErrors = Record<string, string>;

export interface ApiErrorInit {
  status: number;
  type: ApiErrorType;
  message: string;
  fieldErrors?: FieldErrors;
  detail?: string;
}

/** Forma única de error que sale de la capa de API. La construye el errorInterceptor. */
export class ApiError extends Error {
  /** Código HTTP. Vale 0 cuando no hubo respuesta (network y timeout). */
  readonly status: number;
  readonly type: ApiErrorType;
  readonly fieldErrors?: FieldErrors;
  /** Mensaje original de la API, sin traducir. Sirve para depurar, no para mostrarlo. */
  readonly detail?: string;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.type = init.type;
    this.fieldErrors = init.fieldErrors;
    this.detail = init.detail;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }
}
