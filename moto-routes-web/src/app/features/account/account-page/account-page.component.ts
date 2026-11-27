import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthStore } from '../../../core/auth/auth.store';

/** Mi cuenta: quién ha entrado y cerrar la sesión, aquí o en todos los dispositivos. Solo con sesión (authGuard). */
@Component({
  selector: 'app-account-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-page.component.html',
  styleUrls: ['../account.css', './account-page.component.css'],
})
export class AccountPageComponent {
  protected readonly store = inject(AuthStore);
  private readonly auth = inject(AuthService);

  protected readonly leaving = signal(false);
  protected readonly roleLabel = computed(() => (this.store.isAdmin() ? 'Administrador' : 'Rider'));

  protected async logout(everywhere: boolean): Promise<void> {
    this.leaving.set(true);
    // AuthService lleva al inicio al salir de una página privada
    await (everywhere ? this.auth.logoutAll() : this.auth.logout());
  }
}
