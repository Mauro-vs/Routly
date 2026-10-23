import { Injectable } from '@angular/core';

import { Host, HostPayload } from '../../../core/models/host.model';
import { User } from '../../../core/models/user.model';
import { EntityApiService } from '../../../core/services/entity-api.service';

/**
 * Llamadas a `/api/hosts`. Los endpoints comunes vienen de EntityApiService.
 *
 * Además, los usuarios activos para el select del formulario. Se piden desde aquí y
 * no desde la feature de usuarios, porque una feature no importa de otra.
 */
@Injectable({ providedIn: 'root' })
export class HostsService extends EntityApiService<Host, HostPayload> {
  protected readonly path = '/hosts';

  /** Usuarios activos, para el select del formulario. */
  getUserOptions(): Promise<User[]> {
    return this.api.get<User[]>('/users/actives');
  }
}
