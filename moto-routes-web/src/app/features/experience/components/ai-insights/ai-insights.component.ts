import { ChangeDetectionStrategy, Component, DestroyRef, WritableSignal, effect, inject, input, signal } from '@angular/core';

import { AiApiService, AiError } from '../../../../core/ai/ai-api.service';
import { AiChatContextService } from '../../../../core/ai/ai-chat-context.service';
import { AiInsights, AiStops, AiWeather } from '../../../../core/ai/ai.models';
import { isAbortError } from '../../../../core/api/api-error';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { formatShortDate } from '../../../../shared/utils/shop-format';
import { AiStopsComponent } from './ai-stops.component';
import { AiWeatherComponent } from './ai-weather.component';
import { LOADING, Piece } from './piece';

/** Preguntas de ejemplo para el asistente, debajo del bloque */
const QUESTIONS = ['¿Vale para alguien que lleva poco en moto?', '¿Qué tiempo hará en la próxima salida?'];

/**
 * El bloque "Routly IA" del detalle: lo que hay que saber de la experiencia, en cinco piezas.
 *
 * - Resumen y para quién es, qué llevar y preguntas frecuentes: textos escritos por la IA con los
 *   datos de la experiencia (GET /ai/experiences/:slug/insights). Llevan la etiqueta de IA.
 * - El tiempo de las fechas de salida (Open-Meteo) y las paradas (OpenStreetMap): datos reales,
 *   no IA.
 *
 * Las tres peticiones van a la vez y cada pieza enseña lo suyo: si no hay IA configurada (503),
 * los textos no salen, y el tiempo y las paradas sí.
 */
@Component({
  selector: 'app-ai-insights',
  imports: [IconComponent, SkeletonComponent, AiWeatherComponent, AiStopsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ai" aria-labelledby="ia-titulo">
      <header class="ai-head">
        <p class="badge"><ui-icon name="sparkle" /> Routly IA</p>
        <h2 id="ia-titulo">Lo que tienes que saber</h2>
        <p class="note">
          Los textos con <ui-icon name="sparkle" class="inline-icon" /> los escribe una IA con los datos de esta experiencia.
          El tiempo viene de Open-Meteo y las paradas, de OpenStreetMap.
        </p>
      </header>

      <!-- 1. Resumen y para quién es -->
      @switch (insights().status) {
        @case ('loading') {
          <div class="block" aria-busy="true" aria-label="Escribiendo el resumen">
            <ui-skeleton height="18px" width="90%" />
            <ui-skeleton height="18px" width="75%" />
            <ui-skeleton height="18px" width="60%" />
          </div>
        }
        @case ('ready') {
          @if (insights().data; as data) {
            <div class="block">
              <p class="summary"><ui-icon name="sparkle" class="ai-mark" /> {{ data.summary }}</p>
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
            </div>
          }
        }
        @case ('unavailable') {
          <p class="muted">Los textos de la IA no están disponibles ahora mismo.</p>
        }
        @case ('error') {
          <p class="muted" role="status">
            No se han podido escribir los textos de la IA.
            <button type="button" class="link" (click)="loadInsights()">Reintentar</button>
          </p>
        }
      }

      <!-- 2. El tiempo en las fechas de salida (Open-Meteo) -->
      <app-ai-weather [piece]="weather()" />

      <!-- 3. Paradas en la ruta (OpenStreetMap) -->
      <app-ai-stops [piece]="stops()" />

      @if (insights().data; as data) {
        <!-- 4. Qué llevar -->
        <section class="block" aria-labelledby="ia-llevar">
          <h3 id="ia-llevar"><ui-icon name="backpack" /> Qué llevar <ui-icon name="sparkle" class="ai-mark" /></h3>
          <ul class="packing">
            @for (item of data.packing; track $index) {
              <li>{{ item }}</li>
            }
          </ul>
        </section>

        <!-- 5. Preguntas frecuentes -->
        <section class="block" aria-labelledby="ia-preguntas">
          <h3 id="ia-preguntas"><ui-icon name="question" /> Preguntas frecuentes <ui-icon name="sparkle" class="ai-mark" /></h3>
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
        <div class="ask">
          <button type="button" class="btn-ghost" (click)="chat.ask()"><ui-icon name="chat-circle-dots" /> Pregúntale al asistente</button>
          @for (question of questions; track question) {
            <button type="button" class="chip" (click)="chat.ask(question)">{{ question }}</button>
          }
        </div>
        @if (insights().data; as data) {
          <p class="muted small">Textos escritos por {{ data.model }} el {{ shortDate(data.generatedAt) }}. Pueden contener errores: los datos de la ficha mandan.</p>
        }
      </footer>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .ai {
      display: grid;
      gap: var(--space-6);
      padding: var(--space-5);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
    }

    .ai-head {
      display: grid;
      gap: var(--space-2);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      justify-self: start;
      padding: 2px var(--space-2);
      border-radius: var(--radius-pill);
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-size: var(--text-xs);
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    h2 {
      font-size: 24px;
      font-weight: 850;
      letter-spacing: -0.02em;
    }

    h3 {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 18px;
      font-weight: 800;
    }

    .note,
    .muted {
      color: var(--color-text-muted);
    }

    .small {
      font-size: var(--text-sm);
    }

    .inline-icon,
    .ai-mark {
      vertical-align: -0.125em;
      color: var(--color-primary);
    }

    .block {
      display: grid;
      gap: var(--space-3);
    }

    .summary {
      max-width: 65ch;
      font-size: 17px;
      line-height: 1.6;
    }

    .highlights {
      display: grid;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
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
      gap: var(--space-3);
      margin: 0;
    }

    .ideal div {
      padding: var(--space-3);
      border-radius: var(--radius-md);
      background: var(--color-surface-2);
    }

    dt {
      font-size: var(--text-xs);
      font-weight: 750;
      letter-spacing: 0.08em;
      text-transform: uppercase;
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
      gap: var(--space-3);
      padding-top: var(--space-4);
      border-top: 1px dashed var(--color-border-strong);
    }

    .ask {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }

    .chip {
      min-height: 36px;
      padding: 0 var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-pill);
      background: var(--color-surface-2);
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

    @media (max-width: 560px) {
      .ai {
        padding: var(--space-4);
      }
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

  protected readonly questions = QUESTIONS;
  protected readonly shortDate = formatShortDate;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller?.abort());
    effect(() => this.load(this.slug()));
  }

  private load(slug: string): void {
    this.controller?.abort();
    this.controller = new AbortController();
    const { signal } = this.controller;
    void this.fetch(this.insights, () => this.api.insights(slug, signal), signal);
    void this.fetch(this.weather, () => this.api.weather(slug, signal), signal);
    void this.fetch(this.stops, () => this.api.stops(slug, signal), signal);
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
