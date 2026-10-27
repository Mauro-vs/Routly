import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Route, routeTrip } from '../../../../core/models/route.model';
import { BarListComponent } from '../../../../shared/components/bar-list/bar-list.component';
import {
  ChartSeries,
  ColumnChartComponent,
} from '../../../../shared/components/column-chart/column-chart.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import {
  StatItem,
  StatStripComponent,
} from '../../../../shared/components/stat-strip/stat-strip.component';
import { formatMoney, formatNumber, formatRelativeTime } from '../../../../shared/utils/format';
import { DashboardStore } from '../../services/dashboard.store';

/** Los estados de una salida, en el orden fijo de los colores de las gráficas. */
const DEPARTURE_SERIES: readonly ChartSeries[] = [
  { key: 'scheduled', label: 'Programadas', singular: 'programada', color: '--color-chart-1' },
  { key: 'completed', label: 'Realizadas', singular: 'realizada', color: '--color-chart-2' },
  { key: 'cancelled', label: 'Canceladas', singular: 'cancelada', color: '--color-chart-3' },
];

const dayFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric' });
const monthFormat = new Intl.DateTimeFormat('es-ES', { month: 'short' });
const timeFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

/**
 * Dashboard: las cifras del catálogo y de las salidas, y su reparto. Todo sale de los
 * listados de la API (no hay un endpoint de estadísticas): ni tendencias ni
 * comparativas con periodos anteriores, porque la API no guarda histórico.
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    BarListComponent,
    ColumnChartComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    PageHeaderComponent,
    SkeletonComponent,
    StatStripComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  protected readonly store = inject(DashboardStore);
  protected readonly departureSeries = DEPARTURE_SERIES;

  protected readonly showSkeleton = computed(() => this.store.loading() && !this.store.loaded());
  protected readonly loadFailed = computed(
    () => !this.store.loaded() && !this.store.loading() && this.store.error() !== null,
  );

  protected readonly subtitle = computed(() =>
    this.store.loaded()
      ? `Rutas y salidas de un vistazo. Datos de las ${timeFormat.format(this.store.loadedAt())}.`
      : 'Rutas y salidas de un vistazo.',
  );

  protected readonly stats = computed<StatItem[]>(() => {
    const price = this.store.averagePrice();
    const upcoming = this.store.upcoming().length;
    return [
      {
        label: 'Kilómetros en catálogo',
        value: formatNumber(this.store.totalDistance()),
        unit: 'km',
        note: `En ${this.store.total()} rutas`,
      },
      {
        label: 'Rutas activas',
        value: String(this.store.active()),
        unit: `de ${this.store.total()}`,
        note: 'Visibles en el catálogo',
      },
      { label: 'Próximas salidas', value: String(upcoming), note: 'Programadas desde hoy' },
      {
        label: 'Plazas ofertadas',
        value: formatNumber(this.store.upcomingSeats()),
        note: 'En las próximas salidas',
      },
      {
        label: 'Precio medio',
        value: price === null ? '–' : formatMoney(price),
        note: 'Por persona, próximas salidas',
      },
    ];
  });

  constructor() {
    void this.store.load();
  }

  protected reload(): void {
    void this.store.load();
  }

  protected summary(route: Route): string {
    return `${routeTrip(route).text}, ${formatNumber(route.distance)} km`;
  }

  protected updated(route: Route): string {
    return formatRelativeTime(route.updatedAt);
  }

  protected day(iso: string): string {
    return dayFormat.format(new Date(iso));
  }

  protected month(iso: string): string {
    return monthFormat.format(new Date(iso)).replace('.', '');
  }

  protected time(iso: string): string {
    return timeFormat.format(new Date(iso));
  }

  protected money(value: number): string {
    return formatMoney(value);
  }
}
