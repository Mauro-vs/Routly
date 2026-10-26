import { Injectable, inject } from '@angular/core';

import { Route, RoutePayload, missingReferences } from '../../../core/models/route.model';
import { EntityStore } from '../../../core/services/entity.store';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { OptionList } from '../../../core/services/option-list';
import { CollectionLabels } from '../../../shared/utils/labels';
import { RoutesService } from './routes.service';

/** Cómo se nombra la colección en los textos del panel. */
export const ROUTE_LABELS: CollectionLabels = { singular: 'ruta', plural: 'rutas', gender: 'f' };

/**
 * Estado de las rutas con signals: carga, edición, filtro por estado, borrado y
 * papelera vienen de EntityStore. Aquí se añaden las categorías y ubicaciones activas
 * para los selects del formulario.
 */
@Injectable({ providedIn: 'root' })
export class RoutesStore extends EntityStore<Route, RoutePayload> {
  protected readonly api = inject(RoutesService);
  protected readonly listPath = '/routes';
  protected override readonly notFoundMessage = 'Esa ruta ya no existe.';
  readonly labels = ROUTE_LABELS;

  private readonly errorHandler = inject(ErrorHandlerService);
  /** Categorías activas: la API no deja usar una inactiva en una ruta. */
  readonly categoryOptions = new OptionList(
    () => this.api.getCategoryOptions(),
    this.errorHandler,
  );
  /** Ubicaciones activas, para el origen y el destino. */
  readonly locationOptions = new OptionList(
    () => this.api.getLocationOptions(),
    this.errorHandler,
  );

  displayName(route: Route): string {
    return route.title;
  }

  /**
   * Por qué no se puede restaurar todavía: su categoría o una de sus ubicaciones
   * siguen en la papelera, y la API respondería 409.
   */
  restoreBlockedReason(route: Route): string | null {
    const missing = missingReferences(route);
    if (missing.length === 0) return null;
    const verb = missing.length > 1 ? 'sigan' : 'siga';
    return `No se puede restaurar mientras ${missing.join(' y ')} ${verb} en la papelera.`;
  }
}
