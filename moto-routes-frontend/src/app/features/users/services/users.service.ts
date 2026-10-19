import { Injectable } from '@angular/core';

import { User, UserPayload } from '../../../core/models/user.model';
import { EntityApiService } from '../../../core/services/entity-api.service';

/**
 * Llamadas a `/api/users`. Los endpoints comunes vienen de EntityApiService.
 */
@Injectable({ providedIn: 'root' })
export class UsersService extends EntityApiService<User, UserPayload> {
  protected readonly path = '/users';
}
