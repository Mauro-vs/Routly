import { ErrorHandler, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { FORCED_NAVIGATION } from '../guards/unsaved-changes.guard';
import { ApiError, ApiErrorType } from '../models/api-error.model';
import { toApiError } from '../utils/api-error.mapper';
import { NotificationService } from './notification.service';

interface HandleErrorOptions {
  /**
   * El llamante pinta los errores de validación (400, 422) y de duplicado (409)
   * junto a los campos, así que no hace falta un aviso global. Para formularios.
   */
  inline?: boolean;
  /** Adónde ir si el recurso no existe (404). Normalmente, el listado. */
  notFoundRedirect?: string;
  /** Texto del aviso de 404, por ejemplo "Esa ruta ya no existe." */
  notFoundMessage?: string;
  /** Texto del aviso de 409 cuando no significa "duplicado". */
  conflictMessage?: string;
}

const GLOBAL_TITLES: Partial<Record<ApiErrorType, string>> = {
  network: 'Sin conexión con la API',
  timeout: 'La API no responde',
  server: 'Error del servidor',
};

/**
 * Decide cómo se le cuenta al usuario cada fallo. Los stores llaman a `handle` en
 * sus catch y reciben de vuelta el ApiError normalizado.
 *
 * - Red, tiempo de espera y 5xx: diálogo de SweetAlert2.
 * - 404: aviso breve y vuelta al listado.
 * - 400, 422 y 409: en línea si el llamante lo pide; si no, aviso breve.
 */
@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly fallback = inject(ErrorHandler);
  private globalAlertOpen = false;

  handle(error: unknown, options: HandleErrorOptions = {}): ApiError {
    const apiError = toApiError(error);

    // Lo que no viene de la capa de API es un fallo de programación: que no se pierda.
    if (!(error instanceof ApiError)) this.fallback.handleError(error);

    switch (apiError.type) {
      case 'network':
      case 'timeout':
      case 'server':
        void this.showGlobalAlert(apiError);
        break;

      case 'validation':
        if (!options.inline) void this.notifications.errorToast(apiError.message);
        break;

      case 'client':
        if (apiError.isNotFound) {
          void this.notifications.warning(options.notFoundMessage ?? apiError.message);
          if (options.notFoundRedirect) {
            // Forzada: si había un formulario a medias, ya no hay registro que guardar.
            void this.router.navigateByUrl(options.notFoundRedirect, { info: FORCED_NAVIGATION });
          }
        } else if (apiError.isConflict) {
          if (!options.inline) {
            void this.notifications.errorToast(options.conflictMessage ?? apiError.message);
          }
        } else {
          void this.notifications.errorToast(apiError.message);
        }
        break;
    }

    return apiError;
  }

  /** Si varias peticiones fallan a la vez, basta con un diálogo. */
  private async showGlobalAlert(error: ApiError): Promise<void> {
    if (this.globalAlertOpen) return;
    this.globalAlertOpen = true;
    try {
      await this.notifications.error(error.message, GLOBAL_TITLES[error.type]);
    } finally {
      this.globalAlertOpen = false;
    }
  }
}
