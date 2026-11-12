import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ThemeService } from '../../core/services/theme.service';
import { BrandMarkComponent } from '../../shared/ui/brand-mark/brand-mark.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';

/**
 * La cabecera: logo, Inicio, Experiencias y el cambio de tema, sobre la banda. En el Home va
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
    }
  `,
  host: { '[class.is-overlay]': 'overlay()' },
})
export class SiteHeaderComponent {
  /** Transparente, sobre la foto del Home */
  readonly overlay = input(false);

  protected readonly theme = inject(ThemeService);
  protected readonly themeLabel = computed(() =>
    this.theme.theme() === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
  );
}
