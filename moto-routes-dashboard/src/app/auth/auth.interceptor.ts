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
 * Las peticiones a la API van con credenciales (`withCredentials`), para que el navegador
 * mande la cookie httpOnly de la sesión, y ninguna otra: la cookie no debe salir nunca hacia
 * otro dominio. El panel no ve el token ni pone la cabecera Authorization.
 *
 * Con la sesión ya caducada no se envía nada: la petición falla aquí mismo y el
 * errorInterceptor cierra la sesión, sin esperar al 401 de la API.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${environment.apiUrl}/`)) return next(req);

  const expiresAt = inject(AuthStore).expiresAt();
  if (expiresAt !== null && expiresAt <= Date.now()) return throwError(() => tokenExpiredError());

  return next(req.clone({ withCredentials: true }));
};
