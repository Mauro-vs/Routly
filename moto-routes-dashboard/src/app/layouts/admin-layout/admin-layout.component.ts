import { DOCUMENT } from '@angular/common';
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

/** La URL sin parámetros ni fragmento: `/routes?estado=active` es `/routes`. */
function pathOf(url: string): string {
  return url.split(/[?#]/)[0] ?? url;
}

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
  /** Ruta de la página actual, sin los parámetros. */
  private currentPath: string | null = null;

  constructor() {
    this.watchViewport();
    this.hideBrokenImages();

    // Un cambio solo de parámetros (el filtro o la página de un listado) no es otra
    // página: no se vacían las migas ni se mueve el foco.
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart && pathOf(event.url) !== this.currentPath) {
        this.breadcrumbs.clear();
      }
      if (event instanceof NavigationEnd) {
        const path = pathOf(event.urlAfterRedirects);
        const samePage = path === this.currentPath;
        this.currentPath = path;
        if (!samePage) this.onNavigated();
      }
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

  /**
   * Las imágenes son URLs que escribe quien administra: alguna puede no cargar. En vez
   * del icono roto del navegador se ve el hueco de su contenedor (miniatura, avatar,
   * galería). Un solo manejador para todo el panel: el evento `error` no burbujea,
   * pero se captura en el documento.
   */
  private hideBrokenImages(): void {
    const document = inject(DOCUMENT);
    const onError = (event: Event): void => {
      if (event.target instanceof HTMLImageElement) event.target.classList.add('is-broken');
    };
    document.addEventListener('error', onError, true);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('error', onError, true));
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
