import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService, SKIP_REFRESH } from './auth.service';
import { AuthStore } from './auth.store';

/** Los servicios propios, en el mismo origen: a ellos (y solo a ellos) van las cookies. */
const OWN_SERVICES = [environment.apiUrl, environment.authUrl, environment.aiUrl];

const isOwnService = (url: string): boolean => OWN_SERVICES.some((base) => url.startsWith(base));

/** El code que manda la API o auth con el 401: TOKEN_EXPIRED, TOKEN_INVALID o ninguno. */
function codeOf(error: HttpErrorResponse): string | undefined {
  const body: unknown = error.error;
  if (typeof body !== 'object' || body === null) return undefined;
  const code = (body as Record<string, unknown>)['code'];
  return typeof code === 'string' ? code : undefined;
}

/**
 * La sesión del cliente en cada petición a /api, /auth o /ai:
 *
 * 1. Las manda con `withCredentials: true`, para que vayan las cookies httpOnly.
 * 2. Si responden 401 y hay sesión, el token de acceso ha caducado (o el navegador ya ha tirado
 *    su cookie, que dura lo mismo que el token): pide otro a /auth/refresh y repite la petición
 *    una vez. Varias peticiones a la vez comparten el mismo refresh.
 * 3. Si el refresh falla, o el token no vale (TOKEN_INVALID: sesión cerrada en otro sitio,
 *    contraseña cambiada, cuenta desactivada...), se cierra la sesión.
 *
 * Sin sesión, un 401 se queda como está: lo decide quien hizo la petición.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isOwnService(req.url)) return next(req);

  const store = inject(AuthStore);
  const auth = inject(AuthService);
  const request = req.clone({ withCredentials: true });

  return next(request).pipe(
    catchError((error: unknown) => {
      const isSession401 =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.context.get(SKIP_REFRESH) &&
        store.hasSession();
      if (!isSession401) return throwError(() => error);

      if (codeOf(error) === 'TOKEN_INVALID') {
        auth.end();
        return throwError(() => error);
      }

      return from(auth.refresh()).pipe(
        switchMap((renewed) => {
          if (!renewed) return throwError(() => error);
          return next(request).pipe(
            catchError((retryError: unknown) => {
              // Con un token recién emitido sigue sin valer: la sesión no sirve
              if (retryError instanceof HttpErrorResponse && retryError.status === 401) auth.end();
              return throwError(() => retryError);
            }),
          );
        }),
      );
    }),
  );
};
