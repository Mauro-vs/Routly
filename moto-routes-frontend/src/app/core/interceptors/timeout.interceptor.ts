import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { timeout } from 'rxjs';

import { environment } from '../../../environments/environment';

/**
 * Tiempo máximo de espera de una petición concreta, en milisegundos.
 * Por defecto vale `environment.apiTimeout`. Para cambiarlo en una llamada:
 * `api.get(url, { context: new HttpContext().set(REQUEST_TIMEOUT, 30_000) })`.
 */
export const REQUEST_TIMEOUT = new HttpContextToken<number>(() => environment.apiTimeout);

/** Corta la petición si la API no responde a tiempo. El errorInterceptor lo traduce. */
export const timeoutInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(timeout(req.context.get(REQUEST_TIMEOUT)));
