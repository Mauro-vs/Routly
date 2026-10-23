import { Injectable } from '@angular/core';

import { Role } from '../../../core/models/role.model';
import { User, UserPayload } from '../../../core/models/user.model';
import { EntityApiService } from '../../../core/services/entity-api.service';

/**
 * Llamadas a `/api/users`. Los endpoints comunes vienen de EntityApiService.
 *
 * Además, los roles activos para el select del formulario. Se piden desde aquí y no
 * desde la feature de roles, porque una feature no importa de otra.
 */
@Injectable({ providedIn: 'root' })
export class UsersService extends EntityApiService<User, UserPayload> {
  protected readonly path = '/users';

  /** Roles activos, para el select del formulario. */
  getRoleOptions(): Promise<Role[]> {
    return this.api.get<Role[]>('/roles/actives');
  }
}
