import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Rating } from '../../reviews.models';
import { StarsComponent } from '../../../../shared/ui/stars/stars.component';
import { formatRating, plural } from '../../../../shared/utils/shop-format';

/**
 * La cabecera de las opiniones: la media grande con sus estrellas, cuántas hay y una barra por
 * nota, de 5 a 1, con su porcentaje. Cada barra es un botón que filtra la lista por esa nota
 * (y pulsarla otra vez quita el filtro).
 */
@Component({
  selector: 'app-reviews-summary',
  imports: [StarsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reviews-summary.component.html',
  styleUrl: './reviews-summary.component.css',
})
export class ReviewsSummaryComponent {
  readonly rating = input.required<Rating>();
  /** La nota por la que se filtra ahora, o null */
  readonly activeStars = input<number | null>(null);
  readonly toggleStars = output<number>();

  protected readonly average = computed(() => formatRating(this.rating().average));
  protected readonly count = computed(() => plural(this.rating().count, 'opinión', 'opiniones'));
  protected readonly bars = computed(() => {
    const { count, distribution } = this.rating();
    return [5, 4, 3, 2, 1].map((stars) => {
      const value = distribution[String(stars)] ?? 0;
      return { stars, count: value, percent: count ? Math.round((value / count) * 100) : 0 };
    });
  });
}
