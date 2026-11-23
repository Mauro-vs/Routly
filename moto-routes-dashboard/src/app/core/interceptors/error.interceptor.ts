import {
  HttpErrorResponse,
  HttpEvent,
  HttpEventType,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, from, switchMap, tap, throwError } from 'rxjs';

import { SKIP_SESSION_HANDLING } from '../../auth/auth.interceptor';
import { SessionService } from '../../auth/session.service';
import { ApiError } from '../models/api-error.model';
import { ApiStatusService } from '../services/api-status.service';
import { toApiError } from '../utils/api-error.mapper';

/**
 * Un 401 de la API o de auth que se arregla renovando: TOKEN_EXPIRED, o sin code porque el
 * navegador ya ha tirado la cookie del token (dura lo mismo que él). Sin sesión, SessionService
 * no renueva nada. El TOKEN_EXPIRED que lanza el authInterceptor sin enviar nada (la sesión ya
 * no se puede renovar) no es una respuesta HTTP, y ese cierra la sesión.
 */
const canRenew = (raw: unknown, error: ApiError): boolean =>
  raw instanceof HttpErrorResponse && error.isRenewable;

/**
 * Normaliza cualquier fallo a un ApiError y mantiene al día el estado de la conexión.
 * Va el primero en la cadena para ver también el corte del timeoutInterceptor.
 *
 * Un token de acceso caducado (o cuya cookie ya ha tirado el navegador) se renueva con el
 * servicio de auth y la petición se repite una vez, sin que se entere quien la hizo. Un token rechazado (o un refresh que no sirve) termina
 * la sesión, y un 403 la vuelve a comprobar, por si ha cambiado el rol. El resto de avisos los
 * decide quien hizo la petición, con ErrorHandlerService.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const apiStatus = inject(ApiStatusService);
  const session = inject(SessionService);

  const send = (request: HttpRequest<unknown>, retried: boolean): Observable<HttpEvent<unknown>> =>
    next(request).pipe(
      tap((event) => {
        if (event.type === HttpEventType.Response) apiStatus.markOnline();
      }),
      catchError((error: unknown) => {
        const apiError = toApiError(error);

        // Una respuesta 4xx o 5xx también demuestra que la API está en pie.
        if (apiError.type === 'network') apiStatus.markOffline();
        else if (apiError.type !== 'timeout') apiStatus.markOnline();

        if (request.context.get(SKIP_SESSION_HANDLING)) return throwError(() => apiError);

        if (!retried && canRenew(error, apiError)) {
          return from(session.renew()).pipe(
            switchMap((renewed) => (renewed ? send(request, true) : throwError(() => apiError))),
          );
        }

        // Con el token recién renovado sigue sin valer: la sesión no sirve
        if (apiError.isSessionRejected || (retried && apiError.isUnauthorized)) session.reject(apiError);
        else if (apiError.isForbidden) void session.recheck();

        return throwError(() => apiError);
      }),
    );

  return send(req, false);
};
