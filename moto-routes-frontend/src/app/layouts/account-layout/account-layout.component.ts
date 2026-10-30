import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { SessionService } from '../../auth/session.service';
import { BrandMarkComponent } from '../../shared/components/brand-mark/brand-mark.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

/** Armazón de la zona de cada usuario, sin el panel: su perfil y su garaje. */
@Component({
  selector: 'app-account-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, BrandMarkComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bar">
      <a routerLink="/profile" aria-label="Routly, ir a mi perfil"><ui-brand-mark /></a>
      <nav aria-label="Mi cuenta">
        <a
          class="link"
          routerLink="/profile"
          routerLinkActive="is-active"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
        >Mi perfil</a>
        <a class="link" routerLink="/profile/garage" routerLinkActive="is-active" ariaCurrentWhenActive="page">Mi garaje</a>
      </nav>
      <button type="button" class="icon-btn" aria-label="Cerrar sesión" title="Cerrar sesión" (click)="logout()">
        <ui-icon name="sign-out" />
      </button>
    </header>
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
    }

    .bar {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      min-height: var(--layout-topbar);
      padding: var(--space-2) var(--space-5);
      background: var(--color-sidebar);
      color: var(--color-on-sidebar);
    }

    nav {
      display: flex;
      flex: 1;
      gap: var(--space-4);
      min-width: 0;
    }

    nav .link {
      color: var(--color-on-sidebar);
    }

    nav .link.is-active {
      font-weight: 600;
      color: var(--color-accent);
    }

    .icon-btn {
      color: var(--color-on-sidebar);
    }

    .content {
      width: min(100%, var(--layout-content));
      margin: 0 auto;
      padding: var(--space-5);
    }

    @media (max-width: 560px) {
      .bar {
        padding: var(--space-2) var(--space-4);
      }

      .content {
        padding: var(--space-4);
      }
    }
  `,
})
export class AccountLayoutComponent {
  private readonly session = inject(SessionService);

  protected logout(): void {
    void this.session.logout();
  }
}
