import { ChangeDetectionStrategy, Component, DestroyRef, WritableSignal, effect, inject, input, signal, untracked } from '@angular/core';

import { AiApiService, AiError } from '../../../../core/ai/ai-api.service';
import { AiChatContextService } from '../../../../core/ai/ai-chat-context.service';
import { AiInsights, AiRouteMap, AiStops, AiWeather } from '../../../../core/ai/ai.models';
import { isAbortError } from '../../../../core/api/api-error';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { formatShortDate } from '../../../../shared/utils/shop-format';
import { AiRouteMapComponent } from './ai-route-map.component';
import { AiStopsComponent } from './ai-stops.component';
import { AiWeatherComponent } from './ai-weather.component';
import { LOADING, Piece } from './piece';

/** Preguntas de ejemplo para el asistente, debajo del bloque */
const QUESTIONS = ['¿Vale para alguien que lleva poco en moto?', '¿Qué tiempo hará en la próxima salida?'];

/** Cuántas veces se vuelve a pedir el mapa mientras se buscan los sitios, y cada cuánto. */
export const ROUTE_RETRIES = 5;
export const ROUTE_RETRY_MS = 8000;

/**
 * Lo que la IA añade al detalle, en cinco piezas con el mismo estilo que el resto de la ficha (sin
 * tarjeta ni cartel propio: una marca pequeña en lo escrito con IA y una nota al final).
 *
 * - Resumen y para quién es, qué llevar y preguntas frecuentes: textos escritos por la IA con los
 *   datos de la experiencia (GET /ai/experiences/:slug/insights). Llevan la etiqueta de IA.
 * - El mapa del recorrido con dónde comer, miradores y gasolineras (OSRM y OpenStreetMap), el tiempo de
 *   las fechas de salida (Open-Meteo) y las paradas (OpenStreetMap): datos reales, no IA.
 *
 * Las cuatro peticiones van a la vez y cada pieza enseña lo suyo: si no hay IA configurada (503),
 * los textos no salen, y el mapa, el tiempo y las paradas sí.
 */
@Component({
  selector: 'app-ai-insights',
  imports: [IconComponent, SkeletonComponent, AiWeatherComponent, AiStopsComponent, AiRouteMapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ai">
      <!-- 1. Resumen y para quién es (IA) -->
      @switch (insights().status) {
        @case ('loading') {
          <section class="block" aria-labelledby="ia-resumen" aria-busy="true">
            <h2 id="ia-resumen">En pocas palabras</h2>
            <ui-skeleton height="18px" width="90%" />
            <ui-skeleton height="18px" width="70%" />
            <p class="muted small">Preparando el resumen…</p>
          </section>
        }
        @case ('ready') {
          @if (insights().data; as data) {
            <section class="block" aria-labelledby="ia-resumen">
              <h2 id="ia-resumen">En pocas palabras <ui-icon name="sparkle" class="ai-mark" title="Escrito con IA" /><span class="sr-only">(escrito con IA)</span></h2>
              <p class="summary">{{ data.summary }}</p>
              <ul class="highlights">
                @for (highlight of data.highlights; track $index) {
                  <li><ui-icon name="check" /> {{ highlight }}</li>
                }
              </ul>
              <dl class="ideal">
                <div><dt>Nivel</dt><dd>{{ data.idealFor.level }}</dd></div>
                <div><dt>Para quién</dt><dd>{{ data.idealFor.rider }}</dd></div>
                <div><dt>Moto y carnet</dt><dd>{{ data.idealFor.bike }}</dd></div>
              </dl>
            </section>
          }
        }
        @case ('error') {
          <p class="muted small" role="status">
            No hemos podido preparar el resumen.
            <button type="button" class="link" (click)="loadInsights()">Reintentar</button>
          </p>
        }
      }

      <!-- 2. El recorrido en el mapa, con dónde comer, miradores y gasolineras (OSRM y OpenStreetMap) -->
      <app-ai-route-map [piece]="routeMap()" />

      <!-- 3. El tiempo en las fechas de salida (Open-Meteo) -->
      <app-ai-weather [piece]="weather()" />

      <!-- 4. Paradas en la salida y la llegada (OpenStreetMap) -->
      <app-ai-stops [piece]="stops()" />

      @if (insights().data; as data) {
        <!-- 5. Qué llevar (IA) -->
        <section class="block" aria-labelledby="ia-llevar">
          <h2 id="ia-llevar">Qué llevar <ui-icon name="sparkle" class="ai-mark" title="Escrito con IA" /><span class="sr-only">(escrito con IA)</span></h2>
          <ul class="packing">
            @for (item of data.packing; track $index) {
              <li>{{ item }}</li>
            }
          </ul>
        </section>

        <!-- 5. Preguntas frecuentes (IA) -->
        <section class="block" aria-labelledby="ia-preguntas">
          <h2 id="ia-preguntas">Preguntas frecuentes <ui-icon name="sparkle" class="ai-mark" title="Escrito con IA" /><span class="sr-only">(escrito con IA)</span></h2>
          <div class="faq">
            @for (item of data.faq; track $index) {
              <details>
                <summary>{{ item.question }}</summary>
                <p>{{ item.answer }}</p>
              </details>
            }
          </div>
        </section>
      }

      <footer class="ai-foot">
        <p class="ask">
          ¿Te queda alguna duda?
          <button type="button" class="link" (click)="chat.ask()">Pregúntale al asistente</button>
          @for (question of questions; track question) {
            <button type="button" class="chip" (click)="chat.ask(question)">{{ question }}</button>
          }
        </p>
        <p class="muted small">
          <ui-icon name="sparkle" class="ai-mark" /> Escrito con IA a partir de los datos de la ficha@if (insights().data; as data) { ({{ shortDate(data.generatedAt) }})}: si algo no cuadra, mandan los datos de arriba.
          El tiempo es de Open-Meteo y las paradas, de OpenStreetMap.
        </p>
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    /* Como el resto del detalle: secciones seguidas, sin tarjeta propia */
    .ai {
      display: grid;
      gap: var(--space-6);
    }

    h2 {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    .muted {
      color: var(--color-text-muted);
    }

    .small {
      font-size: var(--text-sm);
    }

    /* La marca de "escrito con IA": pequeña y sin color, para no quitar protagonismo */
    .ai-mark {
      font-size: 0.8em;
      vertical-align: 0.05em;
      color: var(--color-text-muted);
    }

    .block {
      display: grid;
      gap: var(--space-3);
    }

    .summary {
      max-width: 65ch;
      line-height: 1.6;
    }

    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .highlights {
      display: grid;
      gap: var(--space-2);
    }

    .highlights li {
      display: flex;
      gap: var(--space-2);
      align-items: baseline;
    }

    .highlights ui-icon {
      flex: none;
      color: var(--color-primary);
      transform: translateY(2px);
    }

    .ideal {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--space-3) var(--space-6);
      margin: 0;
    }

    dt {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    dd {
      margin: var(--space-1) 0 0;
      font-weight: 600;
    }

    .packing {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-2) var(--space-4);
    }

    .packing li {
      position: relative;
      padding-left: var(--space-5);
    }

    .packing li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.35em;
      width: 12px;
      height: 12px;
      border: 2px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
    }

    .faq {
      display: grid;
      border-top: 1px solid var(--color-border);
    }

    details {
      border-bottom: 1px solid var(--color-border);
    }

    summary {
      display: flex;
      align-items: center;
      min-height: 48px;
      font-weight: 700;
      cursor: pointer;
    }

    details p {
      max-width: 65ch;
      padding-bottom: var(--space-3);
      color: var(--color-text-muted);
    }

    .ai-foot {
      display: grid;
      gap: var(--space-2);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border);
    }

    .ask {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }

    .chip {
      min-height: 32px;
      padding: 0 var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-pill);
      background: none;
      color: var(--color-text);
      font: inherit;
      font-size: var(--text-sm);
      cursor: pointer;
    }

    .chip:hover {
      border-color: var(--color-border-strong);
    }

    .link {
      padding: 0;
      border: 0;
      background: none;
      color: var(--color-primary);
      font: inherit;
      font-weight: 700;
      text-decoration: underline;
      cursor: pointer;
    }
  `,
})
export class AiInsightsComponent {
  /** El slug de la experiencia */
  readonly slug = input.required<string>();

  private readonly api = inject(AiApiService);
  protected readonly chat = inject(AiChatContextService);
  private controller: AbortController | null = null;

  protected readonly insights = signal<Piece<AiInsights>>(LOADING);
  protected readonly weather = signal<Piece<AiWeather>>(LOADING);
  protected readonly stops = signal<Piece<AiStops>>(LOADING);
  protected readonly routeMap = signal<Piece<AiRouteMap>>(LOADING);

  protected readonly questions = QUESTIONS;
  protected readonly shortDate = formatShortDate;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller?.abort());
    // Solo depende del slug: lo que lee load() (las piezas) no vuelve a lanzar el efecto
    effect(() => {
      const slug = this.slug();
      untracked(() => this.load(slug));
    });
  }

  private load(slug: string): void {
    this.controller?.abort();
    this.controller = new AbortController();
    const { signal } = this.controller;
    void this.fetch(this.insights, () => this.api.insights(slug, signal), signal);
    void this.fetch(this.weather, () => this.api.weather(slug, signal), signal);
    void this.fetch(this.stops, () => this.api.stops(slug, signal), signal);
    this.routeMap.set(LOADING);
    void this.loadRouteMap(slug, signal, ROUTE_RETRIES);
  }

  /**
   * El mapa sale en cuanto está el recorrido. Si los sitios aún se están buscando, se vuelve
   * a pedir unos segundos después (el servidor sigue buscándolos y los guarda), sin quitar el mapa.
   */
  private async loadRouteMap(slug: string, signal: AbortSignal, retriesLeft: number): Promise<void> {
    try {
      const data = await this.api.routeMap(slug, signal);
      const giveUp = data.placesStatus === 'loading' && retriesLeft === 0;
      this.routeMap.set({ status: 'ready', data: giveUp ? { ...data, placesStatus: 'unavailable' } : data });
      if (data.placesStatus === 'loading' && retriesLeft > 0) {
        const timer = setTimeout(() => void this.loadRouteMap(slug, signal, retriesLeft - 1), ROUTE_RETRY_MS);
        signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
      }
    } catch (error) {
      if (isAbortError(error) || signal.aborted) return;
      const current = this.routeMap();
      // Si ya había mapa, se queda; solo faltan los sitios
      if (current.status === 'ready' && current.data) {
        this.routeMap.set({ status: 'ready', data: { ...current.data, placesStatus: 'unavailable' } });
        return;
      }
      this.routeMap.set({ status: 'error', data: null });
    }
  }

  protected loadInsights(): void {
    const signal = this.controller?.signal;
    void this.fetch(this.insights, () => this.api.insights(this.slug(), signal), signal);
  }

  private async fetch<T>(piece: WritableSignal<Piece<T>>, request: () => Promise<T>, abort?: AbortSignal): Promise<void> {
    piece.set(LOADING);
    try {
      piece.set({ status: 'ready', data: await request() });
    } catch (error) {
      if (isAbortError(error) || abort?.aborted) return;
      piece.set({ status: error instanceof AiError && error.unavailable ? 'unavailable' : 'error', data: null });
    }
  }
}
