import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { ParamMap, Params, Router } from '@angular/router';

import { isAbortError, toApiError } from '../../core/api/api-error';
import { ShopApiService } from '../../core/api/shop-api.service';
import { ShopCategory, ShopExperience, ShopHost, ShopLocation, ShopPage } from '../../core/api/shop.models';
import { ActiveFilter } from '../../shared/ui/active-filters/active-filters.component';
import { DIFFICULTIES, EMPTY_QUERY, SortKey, ShopQuery, URL_PARAMS, parseShopQuery, toApiParams } from './shop-query';

export type FilterKey = 'category' | 'host' | 'location' | 'difficulty';
export type ShopStatus = 'loading' | 'ready' | 'error';

/** Cuántas opciones traen los filtros de categoría, anfitrión y destino (el máximo de la API) */
const FACETS_LIMIT = 50;

/**
 * El estado del Shop. La URL es la fuente de verdad: la página llama a `sync` con sus parámetros
 * cada vez que cambian, y las acciones (filtrar, buscar, ordenar) no tocan el estado: escriben la
 * URL, que vuelve aquí por `sync`. Así recargar, compartir el enlace o ir atrás enseñan lo mismo.
 *
 * Sin carreras: cada petición tiene su AbortController y una nueva aborta la anterior, así una
 * respuesta vieja nunca pisa a la nueva. Mientras llega, se sigue viendo lo anterior.
 */
@Injectable()
export class ShopStore {
  private readonly api = inject(ShopApiService);
  private readonly router = inject(Router);
  private controller: AbortController | null = null;
  private facetsController: AbortController | null = null;

  readonly query = signal<ShopQuery>(EMPTY_QUERY);
  readonly status = signal<ShopStatus>('loading');
  readonly error = signal<string | null>(null);
  readonly experiences = signal<ShopExperience[]>([]);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  /** Si ya ha llegado alguna página: antes, esqueletos; después, lo anterior atenuado */
  readonly loadedOnce = signal(false);

  // Las opciones de los filtros (y los nombres de los filtros puestos)
  readonly categories = signal<ShopCategory[]>([]);
  readonly hosts = signal<ShopHost[]>([]);
  readonly locations = signal<ShopLocation[]>([]);

  /** Los filtros puestos, con su nombre, para verlos y quitarlos de uno en uno */
  readonly activeFilters = computed<ActiveFilter[]>(() => {
    const query = this.query();
    const filters: ActiveFilter[] = [];
    const named = <T extends { slug: string }>(slug: string | null, list: T[], name: (item: T) => string, missing: string, key: string) => {
      if (!slug) return;
      const item = list.find((candidate) => candidate.slug === slug);
      filters.push({ key, label: item ? name(item) : missing });
    };
    named(query.category, this.categories(), (c) => c.name, 'Tipo de carretera no encontrado', URL_PARAMS.category);
    named(query.host, this.hosts(), (h) => h.name, 'Anfitrión no encontrado', URL_PARAMS.host);
    named(query.location, this.locations(), (l) => l.city, 'Destino no encontrado', URL_PARAMS.location);
    if (query.search) filters.push({ key: URL_PARAMS.search, label: `«${query.search}»` });
    if (query.difficulty) filters.push({ key: URL_PARAMS.difficulty, label: DIFFICULTIES[query.difficulty].label });
    if (query.withDates) filters.push({ key: URL_PARAMS.withDates, label: 'Con fechas' });
    return filters;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.controller?.abort();
      this.facetsController?.abort();
    });
  }

  /** Las opciones de los filtros: una vez, al entrar. Si fallan, los filtros se quedan sin opciones. */
  loadFacets(): void {
    const controller = new AbortController();
    this.facetsController = controller;
    const get = <T>(path: string) => this.api.get<{ data: T[] }>(path, { limit: FACETS_LIMIT }, controller.signal);
    void Promise.all([get<ShopCategory>('/categories'), get<ShopHost>('/hosts'), get<ShopLocation>('/locations')])
      .then(([categories, hosts, locations]) => {
        this.categories.set(categories.data);
        this.hosts.set(hosts.data);
        this.locations.set(locations.data);
      })
      .catch(() => undefined);
  }

  /** La URL ha cambiado: se lee y se pide su página. */
  sync(params: ParamMap): void {
    this.query.set(parseShopQuery(params));
    void this.fetch();
  }

  retry(): void {
    void this.fetch();
  }

  // ---------- acciones: escriben la URL (y la URL vuelve por sync) ----------

  setFilter(key: FilterKey, value: string | null): void {
    this.navigate({ [URL_PARAMS[key]]: value });
  }

  setSearch(text: string): void {
    this.navigate({ [URL_PARAMS.search]: text || null });
  }

  setWithDates(on: boolean): void {
    this.navigate({ [URL_PARAMS.withDates]: on ? 'si' : null });
  }

  setSort(sort: SortKey | null): void {
    this.navigate({ [URL_PARAMS.sort]: sort });
  }

  /** Quita un filtro puesto, por su parámetro de la URL */
  removeFilter(param: string): void {
    this.navigate({ [param]: null });
  }

  /** Quita todos los filtros y la búsqueda; el orden se queda */
  clearFilters(): void {
    const { sort: _sort, page: _page, ...filters } = URL_PARAMS;
    this.navigate(Object.fromEntries(Object.values(filters).map((param) => [param, null])));
  }

  // Cambiar algo que no es la página vuelve a la primera
  private navigate(params: Params): void {
    void this.router.navigate([], { queryParams: { ...params, [URL_PARAMS.page]: null }, queryParamsHandling: 'merge' });
  }

  private async fetch(): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const query = this.query();
    this.status.set('loading');
    this.error.set(null);

    try {
      const result = await this.api.get<ShopPage<ShopExperience>>('/experiences', toApiParams(query), controller.signal);
      const { total, totalPages } = result.pagination;

      // Una página que ya no existe (se ha quitado algo, o la URL es vieja): a la última, sin
      // dejar en el historial la que no existía
      if (query.page > 1 && query.page > totalPages) {
        void this.router.navigate([], {
          queryParams: { [URL_PARAMS.page]: totalPages > 1 ? totalPages : null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }

      this.experiences.set(result.data);
      this.total.set(total);
      this.totalPages.set(totalPages);
      this.loadedOnce.set(true);
      this.status.set('ready');
    } catch (error) {
      // Abortada a propósito: ya hay otra en camino (o se ha salido de la página)
      if (isAbortError(error) || controller.signal.aborted) return;
      this.error.set(toApiError(error).message);
      this.status.set('error');
    }
  }
}
