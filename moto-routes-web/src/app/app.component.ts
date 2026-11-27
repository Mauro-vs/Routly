import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { AiChatComponent } from './layout/ai-chat/ai-chat.component';
import { SiteFooterComponent } from './layout/site-footer/site-footer.component';
import { SiteHeaderComponent } from './layout/site-header/site-header.component';

/**
 * El armazón de la web: saltar al contenido, la cabecera, la página y el pie. En el Home la cabecera
 * va transparente, sobre la foto. El asistente (Routly IA) flota encima, en todas las páginas.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent, AiChatComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly router = inject(Router);

  protected readonly isHome = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split(/[?#]/)[0] === '/'),
    ),
    // Desde la primera pintura, con la dirección de entrada: si no, al cargar el Home la cabecera
    // ocuparía su sitio y saltaría arriba al llegar la primera navegación
    { initialValue: inject(Location).path().split(/[?#]/)[0] === '' },
  );
}
