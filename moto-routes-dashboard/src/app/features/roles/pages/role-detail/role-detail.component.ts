import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Role } from '../../../../core/models/role.model';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { EntityDetailPage } from '../../../../shared/pages/entity-detail-page';
import { RolesStore } from '../../services/roles.store';

/** Detalle de un rol (`/roles/:slug`). */
@Component({
  selector: 'app-role-detail',
  imports: [DetailPageComponent, DetailSectionComponent, FieldListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './role-detail.component.html',
})
export class RoleDetailComponent extends EntityDetailPage<Role> {
  protected readonly store = inject(RolesStore);
  protected readonly listPath = '/roles';

  protected readonly toggleLockedReason = computed(() => {
    const role = this.record();
    return role ? this.store.toggleLockedReason(role) : null;
  });
  protected readonly deleteLockedReason = computed(() => {
    const role = this.record();
    return role ? this.store.deleteLockedReason(role) : null;
  });

  protected readonly fields = computed<FieldItem[]>(() => {
    const role = this.record();
    if (!role) return [];
    return [
      { label: 'Nombre visible', value: role.label },
      { label: 'Nombre interno', value: role.name, format: 'mono' },
      {
        label: 'Tipo',
        value: role.isSystem
          ? 'Base: lo crea el seed y no se puede renombrar, desactivar ni eliminar.'
          : 'Personalizado',
        wide: true,
      },
      {
        label: 'Descripción',
        value: role.description,
        format: 'multiline',
        empty: 'Sin descripción',
        wide: true,
      },
    ];
  });
}
