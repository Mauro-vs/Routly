import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  DIFFICULTY_BADGES,
  DIFFICULTY_LABELS,
  Route,
  routeTrip,
} from '../../../../core/models/route.model';
import { NavBadgeService } from '../../../../core/services/nav-badge.service';
import { NAV_GROUPS } from '../../../../layouts/admin-layout/navigation';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { formatNumber, formatRelativeTime } from '../../../../shared/utils/format';
import { DashboardStore } from '../../services/dashboard.store';

/**
 * Portada del panel: cuántos registros hay en cada colección (los mismos contadores
 * del menú) y las cifras de las rutas.
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    PageHeaderComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  protected readonly store = inject(DashboardStore);
  protected readonly badges = inject(NavBadgeService);
  protected readonly groups = NAV_GROUPS;

  protected readonly difficultyLabels = DIFFICULTY_LABELS;
  protected readonly difficultyBadges = DIFFICULTY_BADGES;
  protected readonly skeletonRows = [0, 1, 2, 3];

  protected readonly showSkeleton = computed(() => this.store.loading() && !this.store.loaded());
  protected readonly loadFailed = computed(
    () => !this.store.loaded() && !this.store.loading() && this.store.error() !== null,
  );
  protected readonly totalDistance = computed(() => formatNumber(this.store.totalDistance()));

  constructor() {
    void this.store.load();
  }

  protected reload(): void {
    void this.store.load();
  }

  protected summary(route: Route): string {
    // Espacio de no separación entre la cifra y la unidad.
    return `${routeTrip(route).text}, ${formatNumber(route.distance)} km`;
  }

  protected updated(route: Route): string {
    return formatRelativeTime(route.updatedAt);
  }
}
