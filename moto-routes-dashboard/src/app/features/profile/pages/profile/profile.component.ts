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
  template: `
    @if (user(); as user) {
      <ui-page-header [title]="user.name" [subtitle]="subtitle()">
        <button type="submit" form="profile-form" class="btn btn--primary" [disabled]="saving()">
          @if (saving()) {
            <span class="spinner" aria-hidden="true"></span>Guardando…
          } @else {
            <ui-icon name="check" />Guardar cambios
          }
        </button>
      </ui-page-header>

      <div class="layout">
        <div class="layout__main">
          <app-account-form [user]="user" />
          <app-image-gallery
            ownerType="user"
            [ownerId]="user._id"
            [ownerLabel]="user.name"
            (coverChange)="refreshAvatar()"
          />
        </div>

        <aside class="layout__aside">
          <app-password-form />
        </aside>
      </div>
    } @else {
      <div class="pending card panel" role="status">No se ha podido confirmar tu sesión. Comprueba la conexión con la API.</div>
    }
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      align-items: start;
      gap: var(--space-4);
    }

    .layout__main {
      display: grid;
      gap: var(--space-4);
      min-width: 0;
    }

    .pending {
      margin-top: var(--space-5);
    }

    @media (max-width: 1080px) {
      .layout {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
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
