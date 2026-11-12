import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ApiError, isAbortError, toApiError } from '../../core/api/api-error';
import { ShopApiService } from '../../core/api/shop-api.service';
import { ShopDeparture, ShopExperienceDetail } from '../../core/api/shop.models';

export type ExperienceStatus = 'loading' | 'ready' | 'notFound' | 'error';

/** El parámetro de la URL con la salida elegida: /experiencias/:slug?salida=<slug de la salida> */
export const DEPARTURE_PARAM = 'salida';

/**
 * El estado del detalle: la experiencia (con su anfitrión y su galería) y sus salidas, pedidas a
 * la vez, y la salida elegida. La elegida vive en la URL (`?salida=`): la página la lee y la pasa
 * con `setSelectedSlug`, y `select` la escribe sin llenar el historial. Una salida completa se
 * enseña, pero nunca queda elegida, tampoco si llega en la URL.
 */
@Injectable()
export class ExperienceStore {
  private readonly api = inject(ShopApiService);
  private readonly router = inject(Router);
  private controller: AbortController | null = null;
  private readonly selectedSlug = signal<string | null>(null);

  readonly status = signal<ExperienceStatus>('loading');
  readonly error = signal<string | null>(null);
  readonly experience = signal<ShopExperienceDetail | null>(null);
  readonly departures = signal<ShopDeparture[]>([]);

  /** La salida elegida, si existe y tiene plazas */
  readonly selected = computed(
    () => this.departures().find((departure) => departure.slug === this.selectedSlug() && !departure.isFull) ?? null,
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller?.abort());
  }

  async load(slug: string): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.status.set('loading');
    this.error.set(null);

    try {
      const path = `/experiences/${encodeURIComponent(slug)}`;
      const [detail, departures] = await Promise.all([
        this.api.get<{ data: ShopExperienceDetail }>(path, {}, controller.signal),
        this.api.get<{ data: ShopDeparture[] }>(`${path}/departures`, {}, controller.signal),
      ]);
      this.experience.set(detail.data);
      this.departures.set(departures.data);
      this.status.set('ready');
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return;
      const apiError: ApiError = toApiError(error);
      this.experience.set(null);
      this.departures.set([]);
      this.error.set(apiError.message);
      this.status.set(apiError.isNotFound ? 'notFound' : 'error');
    }
  }

  /** La salida que dice la URL */
  setSelectedSlug(slug: string | null): void {
    this.selectedSlug.set(slug);
  }

  /** Elige una salida: va a la URL sin dejar un paso atrás por cada una que se toque */
  select(slug: string): void {
    void this.router.navigate([], {
      queryParams: { [DEPARTURE_PARAM]: slug },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
