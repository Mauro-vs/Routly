import { Injectable, inject } from '@angular/core';

import { Location, LocationPayload } from '../../../core/models/location.model';
import { EntityStore } from '../../../core/services/entity.store';
import { LocationsService } from './locations.service';

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
}
