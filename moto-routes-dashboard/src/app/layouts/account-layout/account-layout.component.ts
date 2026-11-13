import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthStore } from '../../auth/auth.store';
import { BrandMarkComponent } from '../../shared/components/brand-mark/brand-mark.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';

/** Armazón de la zona de cada usuario, sin el panel: su perfil y su garaje. */
@Component({
  selector: 'app-account-layout',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    BrandMarkComponent,
    UserMenuComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bar on-band">
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
        @if (store.isAdmin()) {
          <a class="link" routerLink="/">Panel</a>
        }
      </nav>
      <app-user-menu />
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
    }

    nav {
      display: flex;
      flex: 1;
      gap: var(--space-4);
      min-width: 0;
    }

    nav .link.is-active {
      font-weight: 700;
      color: var(--color-accent);
    }

    /* El margen lateral: las bandas lo rompen para llegar de lado a lado. */
    .content {
      --gutter: max(24px, calc((100vw - var(--layout-content)) / 2));
      padding: 0 var(--gutter) var(--space-7);
    }

    @media (max-width: 560px) {
      .bar {
        padding: var(--space-2) var(--space-4);
      }

      .content {
        --gutter: 14px;
      }
    }
  `,
})
export class AccountLayoutComponent {
  protected readonly store = inject(AuthStore);
}
