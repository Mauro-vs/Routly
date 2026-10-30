import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';

import { SessionService } from '../../../auth/session.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { NavAction, findSection } from '../navigation';

interface Crumb {
  label: string;
  path?: string;
}

interface CurrentPage {
  url: string;
  /** `data.crumb` de la ruta activa, si lo define. */
  crumb: string | null;
}

/** Barra superior: botón del menú en móvil, migas y la acción de crear de la sección. */
@Component({
  selector: 'app-topbar',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css',
})
export class TopbarComponent {
  /** En pantallas estrechas se muestra el botón que abre el sidebar. */
  readonly showMenu = input(false);
  readonly menuOpen = input(false);
  readonly menu = output<void>();

  private readonly router = inject(Router);
  private readonly breadcrumbs = inject(BreadcrumbService);
  private readonly session = inject(SessionService);
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');

  private readonly page = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.readPage()),
    ),
    { initialValue: this.readPage() },
  );

  protected readonly crumbs = computed<Crumb[]>(() => {
    const { url, crumb } = this.page();
    const section = findSection(url);
    if (!section) return [{ label: crumb ?? 'Routly' }];

    // La última miga es la página dentro de la sección (la papelera, un registro...):
    // el dato cargado o el texto fijo de la ruta.
    const current = url === section.path ? null : (this.breadcrumbs.current() ?? crumb);
    return current
      ? [{ label: section.label, path: section.path }, { label: current }]
      : [{ label: section.label }];
  });

  /** Crear en la sección actual. Las que no crean nada (el resumen) no lo muestran. */
  protected readonly createAction = computed<NavAction | null>(() => {
    const { url } = this.page();
    const action = findSection(url)?.create ?? null;
    return action && action.path !== url ? action : null;
  });

  protected logout(): void {
    void this.session.logout();
  }

  focusMenuButton(): void {
    this.menuButton()?.nativeElement.focus();
  }

  private readPage(): CurrentPage {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;

    const crumb: unknown = route.data['crumb'];
    return {
      url: this.router.url.split(/[?#]/)[0] ?? '/',
      crumb: typeof crumb === 'string' ? crumb : null,
    };
  }
}
