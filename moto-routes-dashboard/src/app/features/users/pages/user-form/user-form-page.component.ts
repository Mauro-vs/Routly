import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';

import { User, UserPayload } from '../../../../core/models/user.model';
import { FormPageComponent } from '../../../../shared/components/form-page/form-page.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { EntityFormPage } from '../../../../shared/pages/entity-form-page';
import { UserFormComponent } from '../../components/user-form/user-form.component';
import { UsersStore } from '../../services/users.store';

/** Crear (`/users/new`) y editar (`/users/:slug/edit`) un usuario. */
@Component({
  selector: 'app-user-form-page',
  imports: [FormPageComponent, UserFormComponent, ImageGalleryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-form-page.component.html',
})
export class UserFormPageComponent extends EntityFormPage<User, UserPayload> {
  protected readonly store = inject(UsersStore);
  protected readonly listPath = '/users';
  protected readonly form = viewChild(UserFormComponent);
  protected readonly isSelf = computed(() => {
    const user = this.record();
    return user ? this.store.isSelf(user) : false;
  });

  constructor() {
    super();
    void this.store.roleOptions.load();
  }
}
