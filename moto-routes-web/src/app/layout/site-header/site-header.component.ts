import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthStore } from '../../core/auth/auth.store';
import { ThemeService } from '../../core/services/theme.service';
import { BrandMarkComponent } from '../../shared/ui/brand-mark/brand-mark.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';

/**
 * La cabecera: logo, Inicio, Experiencias, la cuenta (Entrar o el nombre del cliente) y el cambio
 * de tema, sobre la banda. En el Home va
 * transparente sobre la foto (`overlay`), y el panel de orientación hace de navegación.
 */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, BrandMarkComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap bar">
      <a class="brand" routerLink="/" aria-label="Routly, ir al inicio"><ui-brand-mark /></a>
      <nav aria-label="Principal">
        <a routerLink="/" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page">Inicio</a>
        <a routerLink="/experiencias" routerLinkActive="is-active" ariaCurrentWhenActive="page">Experiencias</a>
      </nav>
      @if (auth.isLoggedIn()) {
        <a class="account" routerLink="/mi-cuenta" routerLinkActive="is-active" ariaCurrentWhenActive="page" aria-label="Mi cuenta">
          <ui-icon name="user-circle" /><span>{{ auth.firstName() }}</span>
        </a>
      } @else {
        <a class="account" routerLink="/entrar" routerLinkActive="is-active" ariaCurrentWhenActive="page" aria-label="Entrar">
          <ui-icon name="user-circle" /><span>Entrar</span>
        </a>
      }
      <button type="button" class="theme" [attr.aria-label]="themeLabel()" (click)="theme.toggle()">
        <ui-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" />
      </button>
    </div>
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      z-index: 10;
      background: var(--color-band);
      color: var(--color-on-band);
    }

    :host(.is-overlay) {
      position: absolute;
      inset: 0 0 auto;
      background: transparent;
    }

    .bar {
      display: flex;
      align-items: center;
      gap: var(--space-6);
      height: var(--layout-header);
    }

    .brand {
      display: block;
      padding: 8px 0;
      --brand-height: 28px;
    }

    nav {
      display: flex;
      gap: var(--space-5);
      margin-right: auto;
      font-weight: 650;
      font-size: var(--text-sm);
    }

    nav a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      color: var(--color-on-band-muted);
      text-decoration: none;
      transition: color var(--motion-fast);
    }

    nav a:hover,
    nav a.is-active {
      color: var(--color-on-band);
    }

    nav a.is-active {
      box-shadow: inset 0 -2px var(--color-accent);
    }

    .account {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 44px;
      max-width: 16ch;
      color: var(--color-on-band);
      font-weight: 650;
      font-size: var(--text-sm);
      text-decoration: none;
    }

    .account ui-icon {
      font-size: 22px;
    }

    .account span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .account.is-active {
      box-shadow: inset 0 -2px var(--color-accent);
    }

    .theme {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border: 1px solid rgb(255 255 255 / 0.22);
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-on-band);
      font-size: 20px;
      cursor: pointer;
    }

    .theme:hover {
      background: rgb(255 255 255 / 0.08);
    }

    a:focus-visible,
    button:focus-visible {
      outline-color: var(--color-accent);
    }

    @media (max-width: 560px) {
      .bar {
        gap: var(--space-4);
      }

      nav {
        gap: var(--space-4);
      }

      /* En el móvil, solo el icono (el enlace lleva aria-label) */
      .account span {
        display: none;
      }
    }
  `,
  host: { '[class.is-overlay]': 'overlay()' },
})
export class SiteHeaderComponent {
  /** Transparente, sobre la foto del Home */
  readonly overlay = input(false);

  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthStore);
  protected readonly themeLabel = computed(() =>
    this.theme.theme() === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
  );
}
