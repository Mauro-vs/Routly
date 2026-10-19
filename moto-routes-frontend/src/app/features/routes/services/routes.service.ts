import { Injectable } from '@angular/core';

import { Category } from '../../../core/models/category.model';
import { Location } from '../../../core/models/location.model';
import { Route, RoutePayload } from '../../../core/models/route.model';
import { EntityApiService } from '../../../core/services/entity-api.service';

/**
 * Llamadas a `/api/routes`. Los 11 endpoints comunes vienen de EntityApiService
 * (ver su comentario).
 *
 * Además, las opciones de los selects del formulario: las categorías y ubicaciones
 * activas. Se piden desde aquí y no desde sus propias features, porque una feature no
 * importa de otra.
 */
@Injectable({ providedIn: 'root' })
export class RoutesService extends EntityApiService<Route, RoutePayload> {
  protected readonly path = '/routes';

  getCategoryOptions(): Promise<Category[]> {
    return this.api.get<Category[]>('/categories/actives');
  }

  getLocationOptions(): Promise<Location[]> {
    return this.api.get<Location[]>('/locations/actives');
  }
}
