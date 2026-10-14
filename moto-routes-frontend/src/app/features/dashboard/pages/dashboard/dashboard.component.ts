import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DIFFICULTY_BADGES, DIFFICULTY_LABELS, Route } from '../../../../core/models/route.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { formatNumber, formatRelativeTime } from '../../../../shared/utils/format';
import { DashboardStore } from '../../services/dashboard.store';

/** Portada del panel: las cifras del catálogo de un vistazo. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, EmptyStateComponent, IconComponent, PageHeaderComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  protected readonly store = inject(DashboardStore);

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

  protected editLink(route: Route): string[] {
    return ['/routes', route.slug, 'edit'];
  }

  protected summary(route: Route): string {
    // Espacio de no separación entre la cifra y la unidad.
    return `${route.startPoint} a ${route.endPoint}, ${formatNumber(route.distance)} km`;
  }

  protected updated(route: Route): string {
    return formatRelativeTime(route.updatedAt);
  }
}
