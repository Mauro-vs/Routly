import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { formatNumber } from '../../../utils/format';

/**
 * Cinco estrellas con la nota (de 0 a 5, con decimales: se redondea a la media estrella más
 * cercana por abajo). Para los lectores de pantalla, "4,5 de 5 estrellas".
 *
 *   <ui-rating-stars [value]="review.rating" />
 */
@Component({
  selector: 'ui-rating-stars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rating-stars.component.html',
  styleUrl: './rating-stars.component.css',
})
export class RatingStarsComponent {
  readonly value = input.required<number>();

  protected readonly percent = computed(() => (Math.floor(Math.max(0, Math.min(5, this.value())) * 2) / 2) * 20);
  protected readonly label = computed(() => `${formatNumber(this.value())} de 5 estrellas`);
}
