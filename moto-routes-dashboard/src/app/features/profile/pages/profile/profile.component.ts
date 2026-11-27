import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';

import { AuthService } from '../../../../auth/auth.service';
import { AuthStore } from '../../../../auth/auth.store';
import { HasUnsavedChanges, warnBeforeUnload } from '../../../../core/guards/unsaved-changes.guard';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { formatDate } from '../../../../shared/utils/format';
import { AccountFormComponent } from '../../components/account-form/account-form.component';
import { PasswordFormComponent } from '../../components/password-form/password-form.component';

/**
 * Mi perfil (`/profile`): siempre el del usuario de la sesión. Sus datos y su contraseña
 * son dos formularios de components/ (la contraseña va aparte porque renueva la sesión);
 * la página pone la cabecera, la galería de su foto y el aviso de cambios sin guardar.
 */
@Component({
  selector: 'app-profile',
  imports: [AccountFormComponent, IconComponent, ImageGalleryComponent, PageHeaderComponent, PasswordFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements HasUnsavedChanges {
  private readonly store = inject(AuthStore);
  private readonly auth = inject(AuthService);
  private readonly account = viewChild(AccountFormComponent);
  private readonly password = viewChild(PasswordFormComponent);

  protected readonly user = this.store.user;
  protected readonly saving = computed(() => this.account()?.saving() ?? false);

  protected readonly subtitle = computed(() => {
    const user = this.user();
    return user ? `${user.role.label} · En Routly desde ${formatDate(user.createdAt)}` : '';
  });

  constructor() {
    warnBeforeUnload(this);
  }

  /** Cambios sin guardar en cualquiera de los dos formularios. */
  hasUnsavedChanges(): boolean {
    return (this.account()?.hasUnsavedChanges() ?? false) || (this.password()?.hasUnsavedChanges() ?? false);
  }

  /** La foto principal ha cambiado en la galería: el avatar del menú se pone al día sin recargar. */
  protected refreshAvatar(): void {
    void this.auth.refreshUser();
  }
}
