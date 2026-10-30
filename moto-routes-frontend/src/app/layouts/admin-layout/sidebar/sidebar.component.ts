import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';

import { ApiStatus, ApiStatusService } from '../../../core/services/api-status.service';
import { CollectionCountsService } from '../../../core/services/collection-counts.service';
import { NavBadgeService } from '../../../core/services/nav-badge.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { BrandMarkComponent } from '../../../shared/components/brand-mark/brand-mark.component';
import { COLLECTION_IDS, NAV_GROUPS, NAV_HOME, findSection } from '../navigation';

/** Alto de la marca de la sección activa (como en el CSS). */
const INDICATOR_HEIGHT = 18;
const COLLAPSED_KEY = 'routly.nav.collapsed';

/** Los grupos plegados de la última visita. Sin almacenamiento, ninguno. */
function readCollapsed(): ReadonlySet<string> {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]');
    return new Set(Array.isArray(saved) ? saved.filter((item) => typeof item === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveCollapsed(collapsed: ReadonlySet<string>): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
  } catch {
    // Sin almacenamiento (modo privado...), solo se pierde el recuerdo.
  }
}

const STATUS_LABELS: Record<ApiStatus, string> = {
  checking: 'Comprobando la API',
  online: 'API conectada',
  offline: 'API sin conexión',
};

/**
 * Sidebar: marca, navegación por grupos de colecciones (plegables, cada colección con
 * su contador), una marca lima que se desliza a la sección activa y el estado de la
 * conexión con la API.
 */
@Component({
  selector: 'app-sidebar',
  imports: [NgTemplateOutlet, RouterLink, IconComponent, BrandMarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  /** En pantallas estrechas el sidebar es un cajón y muestra el botón de cerrar. */
  readonly drawer = input(false);
  readonly closeRequest = output<void>();

  private readonly apiStatus = inject(ApiStatusService);
  private readonly router = inject(Router);
  protected readonly badges = inject(NavBadgeService);

  protected readonly home = NAV_HOME;
  protected readonly groups = NAV_GROUPS;
  protected readonly host = this.apiStatus.host;
  protected readonly docsUrl = this.apiStatus.docsUrl;
  protected readonly status = this.apiStatus.status;
  protected readonly statusLabel = computed(() => STATUS_LABELS[this.status()]);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.currentPath()),
    ),
    { initialValue: this.currentPath() },
  );

  /**
   * Solo una sección activa a la vez: la más concreta. La portada (`/`) no se marca
   * en las demás páginas, cosa que routerLinkActive no distingue sin `exact`.
   */
  protected readonly activeId = computed(() => findSection(this.url())?.id ?? null);

  /** Grupos plegados, por su nombre. Se recuerdan entre visitas. */
  private readonly collapsed = signal<ReadonlySet<string>>(readCollapsed());

  private readonly nav = viewChild.required<ElementRef<HTMLElement>>('nav');
  private readonly navContent = viewChild.required<ElementRef<HTMLElement>>('navContent');
  /** Posición vertical de la marca de la sección activa; null si no se ve. */
  protected readonly indicatorY = signal<number | null>(null);
  /** La primera colocación no se anima: la marca aparece ya en su sitio. */
  protected readonly indicatorReady = signal(false);

  constructor() {
    void this.apiStatus.check();
    void inject(CollectionCountsService).load(COLLECTION_IDS);

    // Al llegar a una sección de un grupo plegado, el grupo se abre para que se vea
    // dónde se está. Plegarlo después sigue siendo posible.
    effect(() => {
      const id = this.activeId();
      const group = this.groups.find((item) => item.items.some((entry) => entry.id === id));
      if (group && untracked(() => this.isCollapsed(group.label))) this.toggle(group.label);
    });

    effect(() => saveCollapsed(this.collapsed()));

    // La marca se recoloca al cambiar de sección o al plegar un grupo...
    afterRenderEffect(() => {
      this.activeId();
      this.collapsed();
      this.placeIndicator();
    });

    // ...y mientras cambia la altura del contenido (un grupo que se pliega, el cajón
    // que se abre en el móvil).
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new ResizeObserver(() => this.placeIndicator());
      observer.observe(this.navContent().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected isCollapsed(label: string): boolean {
    return this.collapsed().has(label);
  }

  protected hasActive(group: (typeof NAV_GROUPS)[number]): boolean {
    return group.items.some((item) => item.id === this.activeId());
  }

  protected toggle(label: string): void {
    this.collapsed.update((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  protected retry(): void {
    void this.apiStatus.check();
  }

  /**
   * Coloca la marca a la altura del enlace activo. Si no se ve (está en un grupo
   * plegado, o el sidebar está oculto en el móvil), la marca se esconde.
   */
  private placeIndicator(): void {
    const active = this.nav().nativeElement.querySelector<HTMLElement>('a.nav__item.is-active');
    // Solo cuenta el inert de un grupo plegado: el del cajón cerrado en el móvil no,
    // porque al abrirse no cambia ningún tamaño que avise de recolocar la marca.
    if (!active || active.offsetHeight === 0 || active.closest('.nav__collapse[inert]')) {
      this.indicatorY.set(null);
      return;
    }
    this.indicatorY.set(active.offsetTop + (active.offsetHeight - INDICATOR_HEIGHT) / 2);
    if (!this.indicatorReady()) requestAnimationFrame(() => this.indicatorReady.set(true));
  }

  private currentPath(): string {
    return this.router.url.split(/[?#]/)[0] ?? '/';
  }
}
