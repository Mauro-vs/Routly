import { Injectable, inject } from '@angular/core';

import { User, UserPayload } from '../../../core/models/user.model';
import { EntityStore } from '../../../core/services/entity.store';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { OptionList } from '../../../core/services/option-list';
import { CollectionLabels } from '../../../shared/utils/labels';
import { UsersService } from './users.service';

/** Cómo se nombra la colección en los textos del panel. */
export const USER_LABELS: CollectionLabels = {
  singular: 'usuario',
  plural: 'usuarios',
  gender: 'm',
};

/**
 * Estado de los usuarios con signals: carga, edición, filtro por estado, borrado y
 * papelera vienen de EntityStore. Aquí se añaden los roles activos para el select
 * del formulario.
 */
@Injectable({ providedIn: 'root' })
export class UsersStore extends EntityStore<User, UserPayload> {
  protected readonly api = inject(UsersService);
  protected readonly listPath = '/users';
  protected override readonly notFoundMessage = 'Ese usuario ya no existe.';
  readonly labels = USER_LABELS;

  /** Roles activos: la API no deja asignar uno inactivo. */
  readonly roleOptions = new OptionList(
    () => this.api.getRoleOptions(),
    inject(ErrorHandlerService),
  );

  displayName(user: User): string {
    return user.name;
  }

  /** Por qué no se puede restaurar todavía: su rol sigue en la papelera. */
  restoreBlockedReason(user: User): string | null {
    return user.role ? null : 'No se puede restaurar mientras su rol siga en la papelera.';
  }
}
