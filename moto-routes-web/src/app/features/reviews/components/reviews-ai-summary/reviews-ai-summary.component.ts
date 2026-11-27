import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';

import { AiReviewTopic } from '../../../../core/ai/ai.models';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { ReviewsStore } from '../../reviews.store';

const SENTIMENT_LABELS: Record<AiReviewTopic['sentiment'], string> = {
  positive: 'se habla bien',
  neutral: 'opiniones divididas',
  negative: 'se habla mal',
};

/**
 * El resumen IA de las opiniones, encima de la lista. Lo pide el store de la sección
 * (GET /ai/{experiences|hosts}/:slug/reviews-summary),
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
  templateUrl: './reviews-ai-summary.component.html',
  styleUrl: './reviews-ai-summary.component.css',
})
export class ReviewsAiSummaryComponent {
  /** El de la sección de opiniones: sabe de qué experiencia o guía es y cuántas opiniones hay */
  protected readonly store = inject(ReviewsStore);

  constructor() {
    // Cuando llega la nota (y cuántas opiniones hay), se pide: el store lo hace una vez por objetivo
    effect(() => {
      this.store.summary();
      untracked(() => void this.store.loadAiSummary());
    });
  }

  protected sentimentLabel(topic: AiReviewTopic): string {
    return SENTIMENT_LABELS[topic.sentiment];
  }
}
