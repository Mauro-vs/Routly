import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BrandMarkComponent } from '../../shared/ui/brand-mark/brand-mark.component';

/** El pie: la marca, qué es Routly, los mismos enlaces que la cabecera y de dónde sale el proyecto. */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, BrandMarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap foot">
      <ui-brand-mark />
      <p>Salidas guiadas en moto por carreteras elegidas una a una, con su anfitrión, su fecha y sus plazas.</p>
      <nav aria-label="Pie de página">
        <a routerLink="/">Inicio</a>
        <a routerLink="/experiencias">Experiencias</a>
      </nav>
      <p class="credit">Proyecto de DAW · Desarrollo Web en Entorno Servidor</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
      background: var(--color-band);
      color: var(--color-on-band-muted);
      font-size: var(--text-sm);
    }

    .foot {
      display: grid;
      grid-template-columns: auto minmax(0, 46ch) 1fr;
      align-items: center;
      gap: var(--space-4) var(--space-6);
      padding-block: var(--space-7);
      --brand-height: 26px;
    }

    nav {
      display: flex;
      justify-content: end;
      gap: var(--space-5);
    }

    nav a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      color: var(--color-on-band);
      font-weight: 650;
      text-decoration: none;
    }

    nav a:hover {
      text-decoration: underline;
    }

    a:focus-visible {
      outline-color: var(--color-accent);
    }

    .credit {
      grid-column: 1 / -1;
      padding-top: var(--space-4);
      border-top: 1px solid rgb(255 255 255 / 0.12);
      font-size: var(--text-xs);
    }

    @media (max-width: 720px) {
      .foot {
        grid-template-columns: 1fr;
      }

      nav {
        justify-content: start;
      }
    }
  `,
})
export class SiteFooterComponent {}
