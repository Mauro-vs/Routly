import { Injectable, inject } from '@angular/core';

import { Departure, DeparturePayload } from '../../../core/models/departure.model';
import { EntityStore } from '../../../core/services/entity.store';
import { DeparturesService } from './departures.service';

/**
 * Estado de las salidas con signals: carga, edición, cambio de estado optimista y
 * papelera vienen de EntityStore. Todavía no tiene páginas; `listPath` es la ruta
 * que tendrá su listado.
 */
@Injectable({ providedIn: 'root' })
export class DeparturesStore extends EntityStore<Departure, DeparturePayload> {
  protected readonly api = inject(DeparturesService);
  protected readonly listPath = '/departures';
  protected override readonly notFoundMessage = 'Esa salida ya no existe.';
}
