import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';

import { ApiStatus, ApiStatusService } from '../../../core/services/api-status.service';
import { NavBadgeService } from '../../../core/services/nav-badge.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { BrandMarkComponent } from '../brand-mark.component';
import { NAV_ITEMS, UPCOMING_ITEMS, findSection } from '../navigation';

const STATUS_LABELS: Record<ApiStatus, string> = {
  checking: 'Comprobando la API',
  online: 'API conectada',
  offline: 'API sin conexión',
};

/** Sidebar: marca, navegación por entidades y estado de la conexión con la API. */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, IconComponent, BrandMarkComponent],
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

  protected readonly items = NAV_ITEMS;
  protected readonly upcoming = UPCOMING_ITEMS;
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
   * Solo una sección activa a la vez: la más concreta. En `/routes/trash` se marca
   * "Papelera" y no "Rutas", cosa que routerLinkActive no sabe distinguir.
   */
  protected readonly activeId = computed(() => findSection(this.url())?.id ?? null);

  constructor() {
    void this.apiStatus.check();
  }

  protected retry(): void {
    void this.apiStatus.check();
  }

  private currentPath(): string {
    return this.router.url.split(/[?#]/)[0] ?? '/';
  }
}
