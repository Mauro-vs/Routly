import { Injectable } from '@angular/core';

import { Experience, ExperiencePayload } from '../../../core/models/experience.model';
import { Host } from '../../../core/models/host.model';
import { Route } from '../../../core/models/route.model';
import { EntityApiService } from '../../../core/services/entity-api.service';

/**
 * Llamadas a `/api/experiences`. Los endpoints comunes vienen de EntityApiService.
 *
 * Además, los anfitriones y las rutas activos para los selects del formulario. Se
 * piden desde aquí y no desde sus features, porque una feature no importa de otra.
 */
@Injectable({ providedIn: 'root' })
export class ExperiencesService extends EntityApiService<Experience, ExperiencePayload> {
  protected readonly path = '/experiences';

  /** Anfitriones activos, para el select del formulario. */
  getHostOptions(): Promise<Host[]> {
    return this.api.get<Host[]>('/hosts/actives');
  }

  /** Rutas activas, para el select del formulario. */
  getRouteOptions(): Promise<Route[]> {
    return this.api.get<Route[]>('/routes/actives');
  }
}
