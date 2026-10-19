import { Injectable, inject } from '@angular/core';

import { Role, RolePayload } from '../../../core/models/role.model';
import { EntityStore } from '../../../core/services/entity.store';
import { RolesService } from './roles.service';

/**
 * Estado de los roles con signals: carga, edición, cambio de estado optimista y
 * papelera vienen de EntityStore. Todavía no tiene páginas; `listPath` es la ruta
 * que tendrá su listado.
 */
@Injectable({ providedIn: 'root' })
export class RolesStore extends EntityStore<Role, RolePayload> {
  protected readonly api = inject(RolesService);
  protected readonly listPath = '/roles';
  protected override readonly notFoundMessage = 'Ese rol ya no existe.';
}
