import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';

import { User, UserPayload } from '../../../../core/models/user.model';
import { FormPageComponent } from '../../../../shared/components/form-page/form-page.component';
import { EntityFormPage } from '../../../../shared/pages/entity-form-page';
import { UserFormComponent } from '../../components/user-form/user-form.component';
import { UsersStore } from '../../services/users.store';

/** Crear (`/users/new`) y editar (`/users/:slug/edit`) un usuario. */
@Component({
  selector: 'app-user-form-page',
  imports: [FormPageComponent, UserFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-form-page
      [heading]="heading()"
      [labels]="store.labels"
      [isEdit]="isEdit()"
      [loading]="loading()"
      [failed]="loadFailed()"
      [saving]="saving()"
      [cancelPath]="cancelPath()"
      [active]="isActive()"
      (activeChange)="setActive($event)"
      (retry)="retry()"
    >
      <app-user-form
        [record]="record()"
        [roles]="store.roleOptions.items()"
        [rolesLoading]="store.roleOptions.loading()"
        (save)="save($event)"
      />
    </ui-form-page>
  `,
})
export class UserFormPageComponent extends EntityFormPage<User, UserPayload> {
  protected readonly store = inject(UsersStore);
  protected readonly listPath = '/users';
  protected readonly form = viewChild(UserFormComponent);

  constructor() {
    super();
    void this.store.roleOptions.load();
  }
}
