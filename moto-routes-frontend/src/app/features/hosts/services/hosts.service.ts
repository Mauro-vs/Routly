import { Injectable } from '@angular/core';

import { Host, HostPayload } from '../../../core/models/host.model';
import { EntityApiService } from '../../../core/services/entity-api.service';

/**
 * Llamadas a `/api/hosts`. Los endpoints comunes vienen de EntityApiService.
 */
@Injectable({ providedIn: 'root' })
export class HostsService extends EntityApiService<Host, HostPayload> {
  protected readonly path = '/hosts';
}
