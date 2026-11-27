import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';

import { Role, RolePayload } from '../../../../core/models/role.model';
import { FormPageComponent } from '../../../../shared/components/form-page/form-page.component';
import { EntityFormPage } from '../../../../shared/pages/entity-form-page';
import { RoleFormComponent } from '../../components/role-form/role-form.component';
import { RolesStore } from '../../services/roles.store';

/** Crear (`/roles/new`) y editar (`/roles/:slug/edit`) un rol. */
@Component({
  selector: 'app-role-form-page',
  imports: [FormPageComponent, RoleFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './role-form-page.component.html',
})
export class RoleFormPageComponent extends EntityFormPage<Role, RolePayload> {
  protected readonly store = inject(RolesStore);
  protected readonly listPath = '/roles';
  protected readonly form = viewChild(RoleFormComponent);

  protected readonly lockedReason = computed(() => {
    const role = this.record();
    return role ? this.store.toggleLockedReason(role) : null;
  });
}
