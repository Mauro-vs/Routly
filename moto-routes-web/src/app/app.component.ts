import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { SiteFooterComponent } from './layout/site-footer/site-footer.component';
import { SiteHeaderComponent } from './layout/site-header/site-header.component';

/**
 * El armazón de la web: saltar al contenido, la cabecera, la página y el pie. En el Home la cabecera
 * va transparente, sobre la foto.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip" href="#contenido">Saltar al contenido</a>
    <app-site-header [overlay]="isHome()" />
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
export class AppComponent {
  private readonly router = inject(Router);

  protected readonly isHome = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split(/[?#]/)[0] === '/'),
    ),
    { initialValue: false },
  );
}
