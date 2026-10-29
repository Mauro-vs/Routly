import { Injectable, computed, inject, signal } from '@angular/core';

import { ApiError } from '../../../core/models/api-error.model';
import { Departure, DepartureState } from '../../../core/models/departure.model';
import { DIFFICULTIES, DIFFICULTY_LABELS, Route } from '../../../core/models/route.model';
import { ApiService } from '../../../core/services/api.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { NavBadgeService } from '../../../core/services/nav-badge.service';

const RECENT_COUNT = 4;
const UPCOMING_COUNT = 5;
/** Categorías con barra propia; el resto se suma en "Otras". */
const CATEGORY_COUNT = 6;
/** Meses de la gráfica de salidas: el actual y los cinco siguientes. */
const MONTHS = 6;

const monthName = new Intl.DateTimeFormat('es-ES', { month: 'short' });
const monthFullName = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

export interface MonthBucket {
  label: string;
  fullLabel: string;
  values: Record<DepartureState, number>;
}

/**
 * Datos del Dashboard. Pide las rutas y las salidas por su cuenta (sin depender de sus
 * features) y calcula las cifras con signals. La API no tiene un endpoint de
 * estadísticas: todo sale de agregar los listados aquí.
 */
@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly api = inject(ApiService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly badges = inject(NavBadgeService);

  private readonly _routes = signal<Route[]>([]);
  private readonly _departures = signal<Departure[]>([]);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);
  private readonly _error = signal<ApiError | null>(null);
  /** Momento de la última carga: las "próximas" salidas se cuentan desde aquí. */
  private readonly _loadedAt = signal(new Date());

  readonly loading = this._loading.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly error = this._error.asReadonly();
  readonly loadedAt = this._loadedAt.asReadonly();

  // ---------- Rutas ----------
  readonly total = computed(() => this._routes().length);
  readonly active = computed(() => this._routes().filter((route) => route.isActive).length);
  readonly totalDistance = computed(() =>
    this._routes().reduce((sum, route) => sum + route.distance, 0),
  );

  readonly byDifficulty = computed(() =>
    DIFFICULTIES.map((difficulty) => ({
      label: DIFFICULTY_LABELS[difficulty],
      value: this._routes().filter((route) => route.difficulty === difficulty).length,
    })),
  );

  /** Todas las categorías, de la que más rutas tiene a la que menos (y por nombre si empatan). */
  private readonly categories = computed(() => {
    const counts = new Map<string, number>();
    for (const route of this._routes()) {
      const name = route.category?.name ?? 'Sin categoría';
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'es'));
  });

  /** Con muchas categorías, solo las CATEGORY_COUNT primeras llevan barra. */
  private readonly categoriesFold = computed(() => this.categories().length > CATEGORY_COUNT + 1);

  readonly byCategory = computed(() =>
    this.categoriesFold() ? this.categories().slice(0, CATEGORY_COUNT) : this.categories(),
  );

  /** Las que se quedan sin barra, resumidas en una línea de texto (null si no hay). */
  readonly otherCategories = computed(() => {
    if (!this.categoriesFold()) return null;
    const rest = this.categories().slice(CATEGORY_COUNT);
    return { count: rest.length, routes: rest.reduce((sum, item) => sum + item.value, 0) };
  });

  readonly recent = computed(() =>
    [...this._routes()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, RECENT_COUNT),
  );

  // ---------- Salidas ----------
  /** Salidas programadas que todavía no han empezado, de la más próxima a la más lejana. */
  readonly upcoming = computed(() => {
    const now = this._loadedAt().getTime();
    return this._departures()
      .filter((departure) => departure.state === 'scheduled' && Date.parse(departure.startAt) > now)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  });

  readonly nextDepartures = computed(() => this.upcoming().slice(0, UPCOMING_COUNT));
  readonly upcomingSeats = computed(() =>
    this.upcoming().reduce((sum, departure) => sum + departure.capacity, 0),
  );
  /** Precio medio por persona de las próximas salidas, o null si no hay ninguna. */
  readonly averagePrice = computed(() => {
    const upcoming = this.upcoming();
    if (upcoming.length === 0) return null;
    return upcoming.reduce((sum, departure) => sum + departure.price, 0) / upcoming.length;
  });

  /** Salidas por mes y por estado, del mes actual a cinco meses vista. */
  readonly byMonth = computed<MonthBucket[]>(() => {
    const start = this._loadedAt();
    const buckets = Array.from({ length: MONTHS }, (_, offset) => {
      const date = new Date(start.getFullYear(), start.getMonth() + offset, 1);
      return {
        year: date.getFullYear(),
        month: date.getMonth(),
        label: monthName.format(date).replace('.', ''),
        fullLabel: monthFullName.format(date),
        values: { scheduled: 0, completed: 0, cancelled: 0 } as Record<DepartureState, number>,
      };
    });
    for (const departure of this._departures()) {
      const date = new Date(departure.startAt);
      const bucket = buckets.find(
        (item) => item.year === date.getFullYear() && item.month === date.getMonth(),
      );
      if (bucket) bucket.values[departure.state]++;
    }
    return buckets.map(({ label, fullLabel, values }) => ({ label, fullLabel, values }));
  });

  async load(): Promise<void> {
    if (this._loading()) return;

    this._loading.set(true);
    this._error.set(null);
    try {
      const [routes, departures] = await Promise.all([
        this.api.get<Route[]>('/routes'),
        this.api.get<Departure[]>('/departures'),
      ]);
      this._routes.set(routes);
      this._departures.set(departures);
      this._loadedAt.set(new Date());
      this._loaded.set(true);
      this.badges.set('routes', routes.length);
      this.badges.set('departures', departures.length);
    } catch (error) {
      this._error.set(this.errors.handle(error, { pageLoad: true }));
    } finally {
      this._loading.set(false);
    }
  }
}
