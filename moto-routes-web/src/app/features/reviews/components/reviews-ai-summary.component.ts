import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';

import { AiApiService } from '../../../core/ai/ai-api.service';
import { AiReviewTopic, AiReviewsSummary } from '../../../core/ai/ai.models';
import { isAbortError } from '../../../core/api/api-error';
import { ReviewTargetType } from '../../../core/reviews/reviews.models';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';

/** Con menos opiniones (contando las que solo tienen estrellas) ni se pide: la IA necesita 3 con comentario */
export const MIN_REVIEWS_FOR_SUMMARY = 3;

const SENTIMENT_LABELS: Record<AiReviewTopic['sentiment'], string> = {
  positive: 'se habla bien',
  neutral: 'opiniones divididas',
  negative: 'se habla mal',
};

/**
 * El resumen IA de las opiniones, encima de la lista (GET /ai/{experiences|hosts}/:slug/reviews-summary),
 * con el estilo del bloque Routly IA del detalle: qué dicen en general, lo que más gusta, lo que se
 * puede mejorar y de qué se habla.
 *
 * Es un extra: mientras carga, un esqueleto; si no hay bastantes opiniones con comentario (null),
 * no hay IA (503) o falla (502), no sale nada y las opiniones se ven igual.
 */
@Component({
  selector: 'app-reviews-ai-summary',
  imports: [IconComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="box" aria-busy="true">
        <p class="eyebrow"><ui-icon name="sparkle" /> Routly IA está leyendo las opiniones…</p>
        <ui-skeleton height="16px" width="95%" />
        <ui-skeleton height="16px" width="80%" />
        <ui-skeleton height="16px" width="60%" />
      </div>
    } @else if (summary(); as data) {
      <section class="box" aria-labelledby="ia-opiniones">
        <h3 id="ia-opiniones" class="eyebrow">
          <ui-icon name="sparkle" /> Routly IA ha resumido {{ data.basedOn }} {{ data.basedOn === 1 ? 'opinión' : 'opiniones' }}
        </h3>
        <p class="summary">{{ data.summary }}</p>

        <div class="columns">
          <div>
            <h4>Lo que más gusta</h4>
            <ul>
              @for (pro of data.pros; track $index) {
                <li><ui-icon name="check" class="pro" /> {{ pro }}</li>
              }
            </ul>
          </div>
          @if (data.cons.length > 0) {
            <div>
              <h4>Lo que se puede mejorar</h4>
              <ul>
                @for (con of data.cons; track $index) {
                  <li><ui-icon name="warning-circle" class="con" /> {{ con }}</li>
                }
              </ul>
            </div>
          }
        </div>

        @if (data.topics.length > 0) {
          <ul class="topics" aria-label="De qué se habla">
            @for (topic of data.topics; track topic.name) {
              <li class="topic" [class]="topic.sentiment" [attr.title]="sentimentLabel(topic)">
                {{ topic.name }} <span class="num">{{ topic.mentions }}</span>
                <span class="sr-only">({{ sentimentLabel(topic) }}, en {{ topic.mentions }} opiniones)</span>
              </li>
            }
          </ul>
        }

        <p class="foot">Resumen generado con IA a partir de las opiniones: puede equivocarse, y mandan las opiniones de abajo.</p>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .box {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
    }

    .eyebrow {
      display: flex;
      gap: var(--space-2);
      align-items: center;
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--color-text-muted);
    }

    .summary {
      max-width: 70ch;
      line-height: 1.6;
    }

    .columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--space-3) var(--space-6);
    }

    h4 {
      margin-bottom: var(--space-2);
      font-size: var(--text-sm);
      font-weight: 800;
    }

    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .columns ul {
      display: grid;
      gap: var(--space-2);
    }

    .columns li {
      display: flex;
      gap: var(--space-2);
      align-items: baseline;
    }

    .columns ui-icon {
      flex: none;
      transform: translateY(2px);
    }

    .pro {
      color: var(--color-success);
    }

    .con {
      color: var(--color-warning);
    }

    .topics {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .topic {
      display: inline-flex;
      gap: var(--space-2);
      align-items: center;
      min-height: 28px;
      padding: 0 var(--space-3);
      border-radius: var(--radius-pill);
      font-size: var(--text-sm);
      font-weight: 600;
      background: var(--color-surface-2);
      color: var(--color-text);
    }

    .topic .num {
      color: var(--color-text-muted);
    }

    .positive {
      background: var(--color-success-bg);
    }

    .negative {
      background: var(--color-danger-bg);
    }

    .foot {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
  `,
})
export class ReviewsAiSummaryComponent {
  readonly type = input.required<ReviewTargetType>();
  readonly slug = input.required<string>();
  /** Cuántas opiniones tiene en total (de la nota): con menos de 3, ni se pide */
  readonly count = input.required<number>();

  private readonly api = inject(AiApiService);
  private controller: AbortController | null = null;

  protected readonly loading = signal(false);
  protected readonly summary = signal<AiReviewsSummary | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller?.abort());
    effect(() => {
      const type = this.type();
      const slug = this.slug();
      const enough = this.count() >= MIN_REVIEWS_FOR_SUMMARY;
      untracked(() => void this.load(type, slug, enough));
    });
  }

  protected sentimentLabel(topic: AiReviewTopic): string {
    return SENTIMENT_LABELS[topic.sentiment];
  }

  private async load(type: ReviewTargetType, slug: string, enough: boolean): Promise<void> {
    this.controller?.abort();
    this.summary.set(null);
    if (!enough) {
      this.loading.set(false);
      return;
    }
    const controller = new AbortController();
    this.controller = controller;
    this.loading.set(true);
    try {
      this.summary.set(await this.api.reviewsSummary(type, slug, controller.signal));
    } catch (error) {
      // Sin IA o si falla: el bloque no sale (las opiniones se ven igual)
      if (isAbortError(error) || controller.signal.aborted) return;
      this.summary.set(null);
    } finally {
      if (this.controller === controller) this.loading.set(false);
    }
  }
}
