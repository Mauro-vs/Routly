import { Injectable, inject } from '@angular/core';

import { User, UserPayload } from '../../../core/models/user.model';
import { EntityStore } from '../../../core/services/entity.store';
import { UsersService } from './users.service';

/**
 * Estado de los usuarios con signals: carga, edición, cambio de estado optimista y
 * papelera vienen de EntityStore. Todavía no tiene páginas; `listPath` es la ruta
 * que tendrá su listado.
 */
@Injectable({ providedIn: 'root' })
export class UsersStore extends EntityStore<User, UserPayload> {
  protected readonly api = inject(UsersService);
  protected readonly listPath = '/users';
  protected override readonly notFoundMessage = 'Ese usuario ya no existe.';
}
