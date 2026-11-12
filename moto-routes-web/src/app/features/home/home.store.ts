import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { isAbortError, toApiError } from '../../core/api/api-error';
import { ShopApiService } from '../../core/api/shop-api.service';
import { ShopCategory, ShopHost, ShopLocation, ShopPage } from '../../core/api/shop.models';

export type HomeStatus = 'loading' | 'ready' | 'error';

/** Cuántas tarjetas trae cada carrusel (el máximo de la API es 50) */
const RAIL_LIMIT = 12;

/**
 * El estado del Home: los tres carruseles (tipos de carretera, anfitriones y destinos) y el total
 * de experiencias, pedidos a la vez. Vive con la página (se provee en ella): al salir, lo que
 * estuviera pidiendo se cancela.
 */
@Injectable()
export class HomeStore {
  private readonly api = inject(ShopApiService);
  private controller: AbortController | null = null;

  readonly status = signal<HomeStatus>('loading');
  readonly error = signal<string | null>(null);
  readonly categories = signal<ShopCategory[]>([]);
  readonly hosts = signal<ShopHost[]>([]);
  readonly locations = signal<ShopLocation[]>([]);
  readonly total = signal<number | null>(null);

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
    const { signal: abort } = controller;
    this.status.set('loading');
    this.error.set(null);

    try {
      const [categories, hosts, locations, experiences] = await Promise.all([
        this.api.get<{ data: ShopCategory[] }>('/categories', { limit: RAIL_LIMIT }, abort),
        this.api.get<{ data: ShopHost[] }>('/hosts', { limit: RAIL_LIMIT }, abort),
        this.api.get<{ data: ShopLocation[] }>('/locations', { limit: RAIL_LIMIT }, abort),
        // Solo el total: una página de una
        this.api.get<ShopPage<unknown>>('/experiences', { limit: 1 }, abort),
      ]);
      this.categories.set(categories.data);
      this.hosts.set(hosts.data);
      this.locations.set(locations.data);
      this.total.set(experiences.pagination.total);
      this.status.set('ready');
    } catch (error) {
      // Cancelada a propósito (otra carga, o se ha salido de la página): no es un fallo
      if (isAbortError(error) || controller.signal.aborted) return;
      this.error.set(toApiError(error).message);
      this.status.set('error');
    }
  }
}
