import { Injectable } from '@angular/core';

import { Bike } from '../../../core/models/bike.model';
import { Departure, DeparturePayload } from '../../../core/models/departure.model';
import { Experience } from '../../../core/models/experience.model';
import { Host } from '../../../core/models/host.model';
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

  /** Las motos que pueden guiar: las activas y públicas del anfitrión de esa experiencia. */
  async getGuideBikes(experienceId: string): Promise<Bike[]> {
    const experience = await this.api.get<Experience>(`/experiences/${experienceId}`);
    const host = await this.api.get<Host>(`/hosts/${experience.hostId}`);
    return (host.bikes ?? []).filter((bike) => bike.isActive && bike.isPublic);
  }
}
