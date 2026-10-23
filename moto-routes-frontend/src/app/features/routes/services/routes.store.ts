import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { Category } from '../../../core/models/category.model';
import { Location } from '../../../core/models/location.model';
import {
  Route,
  RouteDifficulty,
  RoutePayload,
  categoryName,
  routeTrip,
} from '../../../core/models/route.model';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { EntityStore } from '../../../core/services/entity.store';
import { CollectionLabels } from '../../../shared/utils/labels';
import { matchesQuery } from '../../../shared/utils/text';
import { RoutesService } from './routes.service';

export type DifficultyFilter = RouteDifficulty | 'all';
export type RoutesView = 'cards' | 'table';

const VIEW_KEY = 'routly.routes.view';

function readView(): RoutesView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
}

/** Texto en el que busca el listado: título, origen, destino y categoría. */
export function routeSearchText(route: Route): string {
  return `${route.title} ${routeTrip(route).text} ${categoryName(route)}`;
}

/** Cómo se nombra la colección en los textos del panel. */
export const ROUTE_LABELS: CollectionLabels = { singular: 'ruta', plural: 'rutas', gender: 'f' };

/**
 * Estado de las rutas. La carga, la edición, el filtro por estado, el borrado con
 * confirmación y el cambio de estado optimista vienen de EntityStore; aquí se añaden
 * la búsqueda y el filtro por dificultad del listado, que se conservan al volver del
 * formulario.
 */
@Injectable({ providedIn: 'root' })
export class RoutesStore extends EntityStore<Route, RoutePayload> {
  protected readonly api = inject(RoutesService);
  protected readonly listPath = '/routes';
  protected override readonly notFoundMessage = 'Esa ruta ya no existe.';
  readonly labels = ROUTE_LABELS;

  private readonly errorHandler = inject(ErrorHandlerService);

  private readonly _categoryOptions = signal<Category[]>([]);
  private readonly _locationOptions = signal<Location[]>([]);
  private readonly _optionsLoading = signal(false);
  private readonly _optionsLoaded = signal(false);
  /** Categorías activas, para el select del formulario. */
  readonly categoryOptions = this._categoryOptions.asReadonly();
  /** Ubicaciones activas, para los selects de origen y destino. */
  readonly locationOptions = this._locationOptions.asReadonly();
  readonly optionsLoading = this._optionsLoading.asReadonly();
  readonly optionsLoaded = this._optionsLoaded.asReadonly();

  readonly search = signal('');
  readonly difficulty = signal<DifficultyFilter>('all');
  /** Tarjetas o lista. Se recuerda entre visitas. */
  readonly view = signal<RoutesView>(readView());

  readonly hasFilters = computed(
    () => this.search().trim() !== '' || this.status() !== 'all' || this.difficulty() !== 'all',
  );

  /** Rutas que pasan la búsqueda y los filtros, en el orden de la API (la más reciente primero). */
  readonly filtered = computed(() => {
    const search = this.search().trim();
    const status = this.status();
    const difficulty = this.difficulty();

    return this.items().filter((route) => {
      if (status !== 'all' && route.isActive !== (status === 'active')) return false;
      if (difficulty !== 'all' && route.difficulty !== difficulty) return false;
      if (!search) return true;
      return matchesQuery(routeSearchText(route), search);
    });
  });

  constructor() {
    super();

    effect(() => {
      const view = this.view();
      try {
        localStorage.setItem(VIEW_KEY, view);
      } catch {
        // Sin acceso a localStorage la vista dura solo esta visita.
      }
    });
  }

  displayName(route: Route): string {
    return route.title;
  }

  /**
   * Pide las opciones de los selects del formulario. Solo se ofrecen las activas: la
   * API no deja usar una categoría o una ubicación inactiva en una ruta.
   */
  async loadOptions(): Promise<void> {
    if (this._optionsLoading()) return;

    this._optionsLoading.set(true);
    try {
      const [categories, locations] = await Promise.all([
        this.api.getCategoryOptions(),
        this.api.getLocationOptions(),
      ]);
      this._categoryOptions.set(categories);
      this._locationOptions.set(locations);
      this._optionsLoaded.set(true);
    } catch (error) {
      this.errorHandler.handle(error);
    } finally {
      this._optionsLoading.set(false);
    }
  }

  clearFilters(): void {
    this.search.set('');
    this.difficulty.set('all');
    this.setStatus('all');
  }
}
