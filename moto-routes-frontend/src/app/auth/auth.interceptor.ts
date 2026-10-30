import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { tokenExpiredError } from '../core/utils/api-error.mapper';
import { AuthStore } from './auth.store';

/**
 * La llamada gestiona ella misma un 401 o un 403: el errorInterceptor no cierra la sesión
 * ni la vuelve a comprobar. La usa AuthService.
 */
export const SKIP_SESSION_HANDLING = new HttpContextToken<boolean>(() => false);

/**
 * Añade `Authorization: Bearer <token>` a las peticiones a la API, y a ninguna más: el
 * token no debe salir nunca hacia otro dominio.
 *
 * Un token ya caducado no se envía: la petición falla aquí mismo y el errorInterceptor
 * cierra la sesión, sin esperar al 401 de la API.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${environment.apiUrl}/`)) return next(req);

  const store = inject(AuthStore);
  const token = store.token();
  if (!token) return next(req);

  if ((store.expiresAt() ?? 0) <= Date.now()) return throwError(() => tokenExpiredError());

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
