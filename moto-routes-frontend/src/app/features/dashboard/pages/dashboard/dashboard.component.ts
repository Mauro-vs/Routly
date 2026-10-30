import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Route, routeTrip } from '../../../../core/models/route.model';
import { BarListComponent } from '../../../../shared/components/bar-list/bar-list.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { LevelMeterComponent } from '../../../../shared/components/level-meter/level-meter.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { RouteGlyphComponent } from '../../../../shared/components/route-glyph/route-glyph.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import {
  StatItem,
  StatStripComponent,
} from '../../../../shared/components/stat-strip/stat-strip.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { formatMoney, formatNumber } from '../../../../shared/utils/format';
import { DashboardStore } from '../../services/dashboard.store';

const DAY = 24 * 60 * 60 * 1000;

const shortDateFormat = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const timeFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

/**
 * Dashboard: lo primero es cuánto falta para la próxima salida; después, la agenda y las
 * cifras del catálogo. Todo sale de los listados de la API (no hay un endpoint de
 * estadísticas): ni tendencias ni comparativas, porque la API no guarda histórico.
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    BarListComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    LevelMeterComponent,
    PageHeaderComponent,
    RouteGlyphComponent,
    SkeletonComponent,
    StatStripComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  protected readonly store = inject(DashboardStore);
  protected readonly number = formatNumber;
  protected readonly money = formatMoney;

  protected readonly showSkeleton = computed(() => this.store.loading() && !this.store.loaded());
  /** El error de la carga (o null): el recuadro de error cuenta el motivo. */
  protected readonly loadFailed = computed(
    () => (!this.store.loaded() && !this.store.loading() && this.store.error()) || null,
  );

  protected readonly subtitle = computed(() =>
    this.store.loaded()
      ? `Datos de las ${timeFormat.format(this.store.loadedAt())}.`
      : 'Rutas y salidas de un vistazo.',
  );

  protected readonly nextDeparture = computed(() => this.store.nextDepartures()[0] ?? null);

  protected readonly months = computed(() =>
    this.store.byMonth().map(({ label, fullLabel, values }) => ({
      label,
      fullLabel,
      total: values.scheduled + values.completed + values.cancelled,
    })),
  );

  protected readonly stats = computed<StatItem[]>(() => {
    const price = this.store.averagePrice();
    const total = this.store.total();
    return [
      { label: `en ${total} rutas`, value: formatNumber(this.store.totalDistance()), unit: 'km' },
      {
        label: 'rutas activas',
        value: String(this.store.active()),
        unit: `de ${total}`,
        share: total > 0 ? this.store.active() / total : 0,
      },
      { label: 'plazas ofertadas', value: formatNumber(this.store.upcomingSeats()) },
      { label: 'precio medio', value: price === null ? '–' : formatMoney(price) },
    ];
  });

  constructor() {
    void this.store.load();
  }

  protected reload(): void {
    void this.store.load();
  }

  protected trip(route: Route): string {
    return routeTrip(route).text;
  }

  /** Días que faltan, contados desde la última carga, como las cifras de la página. */
  protected daysUntil(iso: string): number {
    return Math.max(0, Math.ceil((Date.parse(iso) - this.store.loadedAt().getTime()) / DAY));
  }

  protected shortDate(iso: string): string {
    return shortDateFormat.format(new Date(iso)).replace('.', '');
  }

  protected dateTime(iso: string): string {
    return this.shortDate(iso);
  }

  protected seats(capacity: number): string {
    return `${capacity} ${capacity === 1 ? 'plaza' : 'plazas'}`;
  }
}
