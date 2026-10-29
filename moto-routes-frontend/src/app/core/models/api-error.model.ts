/**
 * Clase de fallo de una petición, tal como la ve el panel:
 * - network: no hubo respuesta (API parada, sin red, CORS).
 * - timeout: la respuesta no llegó dentro de `apiTimeout`.
 * - validation: 400 o 422, normalmente con errores por campo.
 * - client: el resto de 4xx (404, 409, 401, 403...).
 * - server: cualquier 5xx.
 */
export type ApiErrorType = 'network' | 'timeout' | 'validation' | 'client' | 'server';

/**
 * Lo que reciben las páginas compartidas en `[failed]`: el error de la carga (para contar el
 * motivo) o, si la página no lo tiene a mano, solo si ha fallado.
 */
export type LoadFailure = ApiError | boolean | null;

/** El error de una LoadFailure, si lo trae. */
export function failureError(failure: LoadFailure): ApiError | null {
  return failure instanceof ApiError ? failure : null;
}

/** Mensaje de error por nombre de campo, listo para mostrar junto al control. */
export type FieldErrors = Record<string, string>;

interface ApiErrorInit {
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

  /** 401: no hay sesión, o el token ya no sirve. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** 403: hay sesión, pero sin permiso para eso. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** Un fallo de sesión o de permisos: reintentar sin más no lo arregla. */
  get isAccessDenied(): boolean {
    return this.isUnauthorized || this.isForbidden;
  }

  /**
   * 409 al restaurar porque una de sus referencias (la categoría de una ruta, por
   * ejemplo) sigue en la papelera. El registro sigue eliminado: no hay que darlo por
   * restaurado.
   */
  get isMissingReference(): boolean {
    return this.isConflict && (this.detail?.startsWith('Cannot restore:') ?? false);
  }
}
