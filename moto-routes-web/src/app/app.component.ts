import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SiteFooterComponent } from './layout/site-footer/site-footer.component';
import { SiteHeaderComponent } from './layout/site-header/site-header.component';

/** El armazón de la web: saltar al contenido, la cabecera, la página y el pie. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip" href="#contenido">Saltar al contenido</a>
    <app-site-header />
    <main id="contenido" tabindex="-1"><router-outlet /></main>
    <app-site-footer />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }

    main {
      flex: 1;
      outline: none;
    }

    .skip {
      position: absolute;
      top: var(--space-2);
      left: var(--space-2);
      z-index: 100;
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-md);
      background: var(--color-accent);
      color: var(--color-on-accent);
      font-weight: 750;
      transform: translateY(-200%);
    }

    .skip:focus {
      transform: none;
    }
  `,
})
export class AppComponent {}
