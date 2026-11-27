import { DestroyRef, Injectable, WritableSignal, inject, signal } from '@angular/core';

import { environment } from '../../../../../environments/environment';
import { AiInsights, AiRouteMap, AiStops, AiWeather } from '../../../../core/ai/ai.models';
import { isAiUnavailable } from '../../../../core/api/api-error';
import { AI_URL, ApiService } from '../../../../core/api/api.service';

/** El estado de cada pieza del bloque Routly IA: llegan por separado y una que falla no tapa a las demás. */
export type PieceStatus = 'loading' | 'ready' | 'unavailable' | 'error';

export interface Piece<T> {
  status: PieceStatus;
  data: T | null;
}

export const LOADING: Piece<never> = { status: 'loading', data: null };

/** Cuántas veces se vuelve a pedir el mapa mientras se buscan los sitios, y cada cuánto. */
export const ROUTE_RETRIES = 5;
export const ROUTE_RETRY_MS = 8000;

/**
 * El estado del bloque Routly IA del detalle (lo provee AiInsightsComponent): cuatro piezas que se
 * piden a la vez a /ai/experiences/:slug/... y llegan por separado.
 *
 * - insights: los textos escritos por la IA. Si no hay IA configurada (503), 'unavailable' y no salen.
 * - weather, stops y routeMap: datos reales (Open-Meteo y OpenStreetMap), no IA.
 *
 * Cada carga lleva su AbortController: si se cambia de experiencia, se aborta lo de la anterior.
 */
@Injectable()
export class AiInsightsStore {
  private readonly api = inject(ApiService);
  /** El de la carga en curso (una por experiencia): al cambiar de experiencia se aborta */
  private controller = new AbortController();
  private slug = '';
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly insights = signal<Piece<AiInsights>>(LOADING);
  readonly weather = signal<Piece<AiWeather>>(LOADING);
  readonly stops = signal<Piece<AiStops>>(LOADING);
  readonly routeMap = signal<Piece<AiRouteMap>>(LOADING);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Otra experiencia: las cuatro piezas a la vez. */
  load(slug: string): void {
    this.stop();
    this.controller = new AbortController();
    const abort = this.controller.signal;
    this.slug = slug;
    void this.fetch(this.insights, 'insights', abort);
    void this.fetch(this.weather, 'weather', abort);
    void this.fetch(this.stops, 'stops', abort);
    this.routeMap.set(LOADING);
    void this.loadRouteMap(abort, ROUTE_RETRIES);
  }

  /** "Reintentar" los textos IA. */
  reloadInsights(): void {
    void this.fetch(this.insights, 'insights', this.controller.signal);
  }

  // Se aborta lo que quede de la carga anterior y se para el reintento del mapa
  private stop(): void {
    this.controller.abort();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private get<T>(piece: string, abort: AbortSignal): Promise<T> {
    const url = `${AI_URL}/experiences/${encodeURIComponent(this.slug)}/${piece}`;
    // La IA tarda más que una consulta normal: su propio tiempo máximo
    return this.api.get<{ data: T }>(url, {}, { signal: abort, timeoutMs: environment.aiTimeout }).then((body) => body.data);
  }

  private async fetch<T>(piece: WritableSignal<Piece<T>>, path: string, abort: AbortSignal): Promise<void> {
    piece.set(LOADING);
    try {
      const data = await this.get<T>(path, abort);
      if (!abort.aborted) piece.set({ status: 'ready', data });
    } catch (error) {
      if (abort.aborted) return;
      piece.set({ status: isAiUnavailable(error) ? 'unavailable' : 'error', data: null });
    }
  }

  /**
   * El mapa sale en cuanto está el recorrido. Si los sitios aún se están buscando, se vuelve
   * a pedir unos segundos después (el servidor sigue buscándolos y los guarda), sin quitar el mapa.
   */
  private async loadRouteMap(abort: AbortSignal, retriesLeft: number): Promise<void> {
    try {
      const data = await this.get<AiRouteMap>('route', abort);
      if (abort.aborted) return;
      const giveUp = data.placesStatus === 'loading' && retriesLeft === 0;
      this.routeMap.set({ status: 'ready', data: giveUp ? { ...data, placesStatus: 'unavailable' } : data });
      if (data.placesStatus === 'loading' && retriesLeft > 0) {
        this.retryTimer = setTimeout(() => void this.loadRouteMap(abort, retriesLeft - 1), ROUTE_RETRY_MS);
      }
    } catch {
      if (abort.aborted) return;
      const current = this.routeMap();
      // Si ya había mapa, se queda; solo faltan los sitios
      if (current.status === 'ready' && current.data) {
        this.routeMap.set({ status: 'ready', data: { ...current.data, placesStatus: 'unavailable' } });
        return;
      }
      this.routeMap.set({ status: 'error', data: null });
    }
  }
}
