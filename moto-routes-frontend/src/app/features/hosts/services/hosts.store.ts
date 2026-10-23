import { Injectable, inject } from '@angular/core';

import { Host, HostPayload } from '../../../core/models/host.model';
import { EntityStore } from '../../../core/services/entity.store';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { OptionList } from '../../../core/services/option-list';
import { CollectionLabels } from '../../../shared/utils/labels';
import { UsersService } from '../../users/services/users.service';
import { HostsService } from './hosts.service';

/** Cómo se nombra la colección en los textos del panel. */
export const HOST_LABELS: CollectionLabels = {
  singular: 'anfitrión',
  plural: 'anfitriones',
  gender: 'm',
};

/**
 * Estado de los anfitriones con signals: carga, edición, filtro por estado, borrado y
 * papelera vienen de EntityStore. Aquí se añaden los usuarios activos para el select
 * del formulario.
 */
@Injectable({ providedIn: 'root' })
export class HostsStore extends EntityStore<Host, HostPayload> {
  protected readonly api = inject(HostsService);
  protected readonly listPath = '/hosts';
  protected override readonly notFoundMessage = 'Ese anfitrión ya no existe.';
  readonly labels = HOST_LABELS;

  private readonly users = inject(UsersService);
  /**
   * Usuarios activos para el select. La API no tiene un filtro por rol (está
   * propuesto en NOTES.md): se ofrecen todos y la API rechaza los que no tienen el
   * rol host o ya tienen perfil.
   */
  readonly userOptions = new OptionList(() => this.users.getActives(), inject(ErrorHandlerService));

  displayName(host: Host): string {
    return host.name;
  }

  /** Por qué no se puede restaurar todavía: su usuario sigue en la papelera. */
  restoreBlockedReason(host: Host): string | null {
    return host.user ? null : 'No se puede restaurar mientras su usuario siga en la papelera.';
  }
}
