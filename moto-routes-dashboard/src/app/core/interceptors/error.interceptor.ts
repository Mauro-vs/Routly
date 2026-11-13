import { HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';

import { SKIP_SESSION_HANDLING } from '../../auth/auth.interceptor';
import { SessionService } from '../../auth/session.service';
import { ApiStatusService } from '../services/api-status.service';
import { toApiError } from '../utils/api-error.mapper';

/**
 * Normaliza cualquier fallo a un ApiError y mantiene al día el estado de la conexión.
 * Va el primero en la cadena para ver también el corte del timeoutInterceptor.
 *
 * Un token rechazado termina la sesión, y un 403 la vuelve a comprobar, por si ha cambiado
 * el rol. El resto de avisos los decide quien hizo la petición, con ErrorHandlerService.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const apiStatus = inject(ApiStatusService);
  const session = inject(SessionService);

  return next(req).pipe(
    tap((event) => {
      if (event.type === HttpEventType.Response) apiStatus.markOnline();
    }),
    catchError((error: unknown) => {
      const apiError = toApiError(error);

      // Una respuesta 4xx o 5xx también demuestra que la API está en pie.
      if (apiError.type === 'network') apiStatus.markOffline();
      else if (apiError.type !== 'timeout') apiStatus.markOnline();

      if (!req.context.get(SKIP_SESSION_HANDLING)) {
        if (apiError.isSessionRejected) session.reject(apiError);
        else if (apiError.isForbidden) void session.recheck();
      }

      return throwError(() => apiError);
    }),
  );
};
