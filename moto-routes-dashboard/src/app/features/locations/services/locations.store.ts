import { Injectable, inject } from '@angular/core';

import { Location, LocationPayload } from '../../../core/models/location.model';
import { EntityStore } from '../../../core/services/entity.store';
import { CollectionLabels } from '../../../shared/utils/labels';
import { LocationsService } from './locations.service';

/** Cómo se nombra la colección en los textos del panel. */
export const LOCATION_LABELS: CollectionLabels = {
  singular: 'ubicación',
  plural: 'ubicaciones',
  gender: 'f',
};

/**
 * Estado de las ubicaciones con signals: carga, edición, cambio de estado optimista y
 * papelera vienen de EntityStore. Todavía no tiene páginas; `listPath` es la ruta
 * que tendrá su listado.
 */
@Injectable({ providedIn: 'root' })
export class LocationsStore extends EntityStore<Location, LocationPayload> {
  protected readonly api = inject(LocationsService);
  protected readonly listPath = '/locations';
  protected override readonly notFoundMessage = 'Esa ubicación ya no existe.';
  readonly labels = LOCATION_LABELS;

  displayName(location: Location): string {
    return location.city;
  }

  /** Por ciudad, sin distinguir mayúsculas ni tildes, como la API. */
  protected override compare(a: Location, b: Location): number {
    return a.city.localeCompare(b.city, 'es', { sensitivity: 'base' });
  }
}
