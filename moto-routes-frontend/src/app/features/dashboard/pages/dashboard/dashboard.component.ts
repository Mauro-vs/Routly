import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { StatItem } from '../../../../shared/components/stat-strip/stat-strip.component';
import { formatMoney, formatNumber } from '../../../../shared/utils/format';
import { DashboardAgendaComponent } from '../../components/dashboard-agenda/dashboard-agenda.component';
import {
  DashboardCatalogComponent,
  MonthTotal,
} from '../../components/dashboard-catalog/dashboard-catalog.component';
import { DashboardHeroComponent } from '../../components/dashboard-hero/dashboard-hero.component';
import { DashboardStore } from '../../services/dashboard.store';

const timeFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

/**
 * Dashboard: lo primero es cuánto falta para la próxima salida; después, la agenda y las
 * cifras del catálogo. Todo sale de los listados de la API (no hay un endpoint de
 * estadísticas): ni tendencias ni comparativas, porque la API no guarda histórico.
 *
 * La página carga y elige qué se ve (error, esqueleto, vacío o el contenido); cada bloque
 * es un componente de components/ que recibe sus datos ya calculados.
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    DashboardAgendaComponent,
    DashboardCatalogComponent,
    DashboardHeroComponent,
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

  protected readonly months = computed<MonthTotal[]>(() =>
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
}
