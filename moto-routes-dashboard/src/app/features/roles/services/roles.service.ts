import { Injectable } from '@angular/core';

import { Role, RolePayload } from '../../../core/models/role.model';
import { EntityApiService } from '../../../core/services/entity-api.service';

/**
 * Llamadas a `/api/roles`. Los endpoints comunes vienen de EntityApiService.
 */
@Injectable({ providedIn: 'root' })
export class RolesService extends EntityApiService<Role, RolePayload> {
  protected readonly path = '/roles';
}
