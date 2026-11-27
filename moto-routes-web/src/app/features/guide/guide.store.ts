import { DestroyRef, Injectable, inject, signal } from '@angular/core';

import { toApiError } from '../../core/api/api-error';
import { ApiService, SHOP_URL } from '../../core/api/api.service';
import { ShopHostDetail } from '../../core/api/shop.models';

export type GuideStatus = 'loading' | 'ready' | 'notFound' | 'error';

/** La ficha de un guía: su perfil, sus dos notas y sus experiencias (/api/shop/hosts/:slug). */
@Injectable()
export class GuideStore {
  private readonly api = inject(ApiService);
  /** El de la última carga: al pedir otra (o salir de la página) se aborta */
  private controller: AbortController | null = null;

  readonly status = signal<GuideStatus>('loading');
  readonly error = signal<string | null>(null);
  readonly guide = signal<ShopHostDetail | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller?.abort());
  }

  /** quiet: recargar sin pasar por "cargando" (las notas, después de opinar) */
  async load(slug: string, { quiet = false } = {}): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    if (!quiet) {
      this.status.set('loading');
      this.error.set(null);
    }
    try {
      const { data } = await this.api.get<{ data: ShopHostDetail }>(`${SHOP_URL}/hosts/${encodeURIComponent(slug)}`, {}, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      this.guide.set(data);
      this.status.set('ready');
    } catch (error) {
      if (controller.signal.aborted || quiet) return;
      const apiError = toApiError(error);
      this.guide.set(null);
      this.error.set(apiError.message);
      this.status.set(apiError.isNotFound ? 'notFound' : 'error');
    }
  }
}
