import { Injectable, inject } from '@angular/core';

import { Host, HostPayload } from '../../../core/models/host.model';
import { EntityStore } from '../../../core/services/entity.store';
import { HostsService } from './hosts.service';

/**
 * Estado de los anfitriones con signals: carga, edición, cambio de estado optimista y
 * papelera vienen de EntityStore. Todavía no tiene páginas; `listPath` es la ruta
 * que tendrá su listado.
 */
@Injectable({ providedIn: 'root' })
export class HostsStore extends EntityStore<Host, HostPayload> {
  protected readonly api = inject(HostsService);
  protected readonly listPath = '/hosts';
  protected override readonly notFoundMessage = 'Ese anfitrión ya no existe.';
}
