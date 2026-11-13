import { Injectable, inject } from '@angular/core';

import { Role, RolePayload } from '../../../core/models/role.model';
import { EntityStore } from '../../../core/services/entity.store';
import { CollectionLabels } from '../../../shared/utils/labels';
import { RolesService } from './roles.service';

/** Cómo se nombra la colección en los textos del panel. */
export const ROLE_LABELS: CollectionLabels = { singular: 'rol', plural: 'roles', gender: 'm' };

/**
 * Lo que la API no deja hacer con un rol base (`isSystem`): los crea el seed y el
 * código depende de ellos. Las acciones se desactivan con este motivo a la vista.
 */
export const SYSTEM_ROLE_REASONS = {
  deactivate: 'Los roles base no se pueden desactivar.',
  remove: 'Los roles base no se pueden eliminar.',
  rename: 'Los roles base no se pueden renombrar.',
} as const;

/**
 * Estado de los roles con signals: carga, edición, filtro por estado, borrado y
 * papelera vienen de EntityStore.
 */
@Injectable({ providedIn: 'root' })
export class RolesStore extends EntityStore<Role, RolePayload> {
  protected readonly api = inject(RolesService);
  protected readonly listPath = '/roles';
  protected override readonly notFoundMessage = 'Ese rol ya no existe.';
  readonly labels = ROLE_LABELS;

  displayName(role: Role): string {
    return role.label;
  }

  /** Por qué no se puede activar o desactivar. Un rol base activo no se desactiva. */
  toggleLockedReason(role: Role): string | null {
    return role.isSystem && role.isActive ? SYSTEM_ROLE_REASONS.deactivate : null;
  }

  /** Por qué no se puede eliminar. */
  deleteLockedReason(role: Role): string | null {
    return role.isSystem ? SYSTEM_ROLE_REASONS.remove : null;
  }
}
