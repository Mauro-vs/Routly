import { Injectable, computed, inject, signal } from '@angular/core';

import { ApiError } from '../../../core/models/api-error.model';
import { DIFFICULTIES, DIFFICULTY_LABELS, Route } from '../../../core/models/route.model';
import { ApiService } from '../../../core/services/api.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { NavBadgeService } from '../../../core/services/nav-badge.service';

const RECENT_COUNT = 5;

/**
 * Datos del resumen. Pide las rutas por su cuenta, sin depender de la feature de
 * rutas, y calcula las cifras con signals. Cuando haya más entidades, aquí se
 * añaden sus peticiones.
 */
@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly api = inject(ApiService);
  private readonly errors = inject(ErrorHandlerService);
  private readonly badges = inject(NavBadgeService);

  private readonly _routes = signal<Route[]>([]);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);
  private readonly _error = signal<ApiError | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly error = this._error.asReadonly();

  readonly total = computed(() => this._routes().length);
  readonly active = computed(() => this._routes().filter((route) => route.isActive).length);
  readonly inactive = computed(() => this.total() - this.active());
  readonly totalDistance = computed(() =>
    this._routes().reduce((sum, route) => sum + route.distance, 0),
  );

  /** Cuántas rutas hay de cada dificultad y qué parte del catálogo suponen. */
  readonly byDifficulty = computed(() => {
    const total = this.total();
    return DIFFICULTIES.map((difficulty) => {
      const count = this._routes().filter((route) => route.difficulty === difficulty).length;
      return {
        difficulty,
        label: DIFFICULTY_LABELS[difficulty],
        count,
        share: total > 0 ? count / total : 0,
      };
    });
  });

  readonly recent = computed(() =>
    [...this._routes()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, RECENT_COUNT),
  );

  async load(): Promise<void> {
    if (this._loading()) return;

    this._loading.set(true);
    this._error.set(null);
    try {
      // Las eliminadas solo se piden para el contador de la papelera en el menú.
      const [routes, deleted] = await Promise.all([
        this.api.get<Route[]>('/routes'),
        this.api.get<Route[]>('/routes/deleted'),
      ]);
      this._routes.set(routes);
      this._loaded.set(true);
      this.badges.set('routes', routes.length);
      this.badges.set('routes-trash', deleted.length);
    } catch (error) {
      this._error.set(this.errors.handle(error));
    } finally {
      this._loading.set(false);
    }
  }
}
