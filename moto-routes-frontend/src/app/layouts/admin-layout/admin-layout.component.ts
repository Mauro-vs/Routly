import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';

import { BreadcrumbService } from '../../core/services/breadcrumb.service';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';

// El mismo corte que usan las hojas de estilo del layout.
const COMPACT_QUERY = '(max-width: 900px)';

/**
 * Armazón del panel: sidebar, barra superior y la zona donde se pinta cada página.
 * En pantallas estrechas el sidebar se colapsa en un cajón que se abre con un botón.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
  host: { '(document:keydown.escape)': 'closeDrawer()' },
})
export class AdminLayoutComponent {
  private readonly router = inject(Router);
  private readonly breadcrumbs = inject(BreadcrumbService);
  private readonly injector = inject(Injector);

  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');
  private readonly topbar = viewChild.required(TopbarComponent);
  private readonly sidebar = viewChild.required<SidebarComponent, ElementRef<HTMLElement>>(
    SidebarComponent,
    { read: ElementRef },
  );

  protected readonly compact = signal(false);
  protected readonly drawerOpen = signal(false);
  /** El cajón solo se anima al abrirlo o cerrarlo, no al cambiar el ancho de la ventana. */
  protected readonly drawerMotion = signal(false);

  private firstNavigation = true;

  constructor() {
    this.watchViewport();

    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) this.breadcrumbs.clear();
      if (event instanceof NavigationEnd) this.onNavigated();
    });
  }

  protected openDrawer(): void {
    this.drawerMotion.set(true);
    this.drawerOpen.set(true);
    this.focusWhenRendered(() =>
      this.sidebar().nativeElement.querySelector<HTMLElement>('a, button'),
    );
  }

  protected closeDrawer(): void {
    if (!this.drawerOpen()) return;
    this.drawerOpen.set(false);
    afterNextRender(() => this.topbar().focusMenuButton(), { injector: this.injector });
  }

  protected skipToContent(event: Event): void {
    // Con <base href="/"> un enlace "#contenido" navegaría a la portada.
    event.preventDefault();
    this.main().nativeElement.focus();
  }

  private onNavigated(): void {
    this.drawerOpen.set(false);

    // Tras navegar, el foco pasa al contenido para que el teclado y el lector de
    // pantalla sigan desde la página nueva. En la primera carga no se toca.
    if (this.firstNavigation) {
      this.firstNavigation = false;
      return;
    }
    this.focusWhenRendered(() => this.main().nativeElement);
  }

  /**
   * Mueve el foco cuando la vista ya refleja el cambio de estado. Mientras tanto el
   * destino puede seguir marcado como `inert` y el navegador ignoraría el foco.
   */
  private focusWhenRendered(target: () => HTMLElement | null): void {
    afterNextRender(() => target()?.focus({ preventScroll: true }), { injector: this.injector });
  }

  private watchViewport(): void {
    const query = window.matchMedia(COMPACT_QUERY);
    this.compact.set(query.matches);

    const onChange = (event: MediaQueryListEvent): void => {
      this.compact.set(event.matches);
      this.drawerMotion.set(false);
      if (!event.matches) this.drawerOpen.set(false);
    };
    query.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));
  }
}
