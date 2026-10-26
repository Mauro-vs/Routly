import { Injectable } from '@angular/core';

import { Departure, DeparturePayload } from '../../../core/models/departure.model';
import { Experience } from '../../../core/models/experience.model';
import { EntityApiService } from '../../../core/services/entity-api.service';

/**
 * Llamadas a `/api/departures`. Los endpoints comunes vienen de EntityApiService.
 *
 * Además, las experiencias activas para el select del formulario. Se piden desde aquí
 * y no desde su feature, porque una feature no importa de otra.
 */
@Injectable({ providedIn: 'root' })
export class DeparturesService extends EntityApiService<Departure, DeparturePayload> {
  protected readonly path = '/departures';

  /** Experiencias activas, para el select del formulario. */
  getExperienceOptions(): Promise<Experience[]> {
    return this.api.get<Experience[]>('/experiences/actives');
  }
}
