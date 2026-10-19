import { Injectable } from '@angular/core';

import { Departure, DeparturePayload } from '../../../core/models/departure.model';
import { EntityApiService } from '../../../core/services/entity-api.service';

/**
 * Llamadas a `/api/departures`. Los endpoints comunes vienen de EntityApiService.
 */
@Injectable({ providedIn: 'root' })
export class DeparturesService extends EntityApiService<Departure, DeparturePayload> {
  protected readonly path = '/departures';

  /** Una salida por su SKU (`RTL-DEP-261108-7QX2M`). La API lo acepta también en minúsculas. */
  getBySku(sku: string): Promise<Departure> {
    return this.api.get<Departure>(`${this.path}/sku/${encodeURIComponent(sku)}`);
  }
}
