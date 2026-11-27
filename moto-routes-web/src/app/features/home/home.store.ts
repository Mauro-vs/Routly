import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { toApiError } from '../../core/api/api-error';
import { ApiService, SHOP_URL } from '../../core/api/api.service';
import { ShopCategory, ShopExperience, ShopHost, ShopLocation, ShopPage } from '../../core/api/shop.models';

export type HomeStatus = 'loading' | 'ready' | 'error';

/** Cuántas tarjetas trae cada carrusel (el máximo de la API es 50) */
const RAIL_LIMIT = 12;
/** Cuántas filas trae el tablón de próximas salidas */
const BOARD_LIMIT = 5;

/**
 * El estado del Home: los tres carruseles (tipos de carretera, anfitriones y destinos) y el total
 * de experiencias, pedidos a la vez. Vive con la página (se provee en ella): al salir, lo que
 * estuviera pidiendo se cancela.
 */
@Injectable()
export class HomeStore {
  private readonly api = inject(ApiService);
  /** El de la última carga: al pedir otra (o salir de la página) se aborta */
  private controller: AbortController | null = null;

  readonly status = signal<HomeStatus>('loading');
  readonly error = signal<string | null>(null);
  readonly categories = signal<ShopCategory[]>([]);
  readonly hosts = signal<ShopHost[]>([]);
  readonly locations = signal<ShopLocation[]>([]);
  readonly total = signal<number | null>(null);
  /** Las que salen antes, de la más próxima a la más lejana, para el tablón */
  readonly upcoming = signal<ShopExperience[]>([]);

  /** La foto de portada: la del tipo de carretera con más experiencias (o el paisaje de marca). */
  readonly cover = computed(() => {
    const [top] = [...this.categories()].sort((a, b) => b.experienceCount - a.experienceCount);
    return top ? { url: top.coverImage?.url ?? null, seed: top.slug } : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller?.abort());
  }

  async load(): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.status.set('loading');
    this.error.set(null);

    try {
      const [categories, hosts, locations, experiences, upcoming] = await Promise.all([
        this.api.get<{ data: ShopCategory[] }>(`${SHOP_URL}/categories`, { limit: RAIL_LIMIT }, { signal: controller.signal }),
        this.api.get<{ data: ShopHost[] }>(`${SHOP_URL}/hosts`, { limit: RAIL_LIMIT }, { signal: controller.signal }),
        this.api.get<{ data: ShopLocation[] }>(`${SHOP_URL}/locations`, { limit: RAIL_LIMIT }, { signal: controller.signal }),
        // Solo el total: una página de una
        this.api.get<ShopPage<unknown>>(`${SHOP_URL}/experiences`, { limit: 1 }, { signal: controller.signal }),
        this.api.get<ShopPage<ShopExperience>>(`${SHOP_URL}/experiences`, {
          hasDepartures: true,
          sort: 'nextDepartureAt',
          limit: BOARD_LIMIT,
        }, { signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      this.categories.set(categories.data);
      this.hosts.set(hosts.data);
      this.locations.set(locations.data);
      this.total.set(experiences.pagination.total);
      this.upcoming.set(upcoming.data);
      this.status.set('ready');
    } catch (error) {
      // Ya hay otra carga en camino
      if (controller.signal.aborted) return;
      this.error.set(toApiError(error).message);
      this.status.set('error');
    }
  }
}
