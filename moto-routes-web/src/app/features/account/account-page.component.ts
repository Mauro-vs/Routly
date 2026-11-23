import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';

/** Mi cuenta: quién ha entrado y cerrar la sesión, aquí o en todos los dispositivos. Solo con sesión (authGuard). */
@Component({
  selector: 'app-account-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="account-page">
      @if (store.user(); as user) {
        <div class="account-card">
          <h1>Hola, {{ store.firstName() }}</h1>
          <dl>
            <dt>Nombre</dt>
            <dd>{{ user.name }}</dd>
            <dt>Correo</dt>
            <dd>{{ user.email }}</dd>
            <dt>Tipo de cuenta</dt>
            <dd>{{ roleLabel() }}</dd>
          </dl>
          <p>Tu sesión se renueva sola mientras uses la web. Si pasas 7 días sin entrar, tendrás que volver a hacerlo.</p>
          <div class="actions">
            <button class="btn-primary" type="button" [disabled]="leaving()" (click)="logout(false)">Cerrar sesión</button>
            <button class="btn-ghost" type="button" [disabled]="leaving()" (click)="logout(true)">Cerrar en todos los dispositivos</button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--space-2) var(--space-4);
      margin: 0;
    }

    dt {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }

    dd {
      margin: 0;
      font-weight: 650;
      overflow-wrap: anywhere;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
  `,
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
