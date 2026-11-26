import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { formatNumber } from '../../utils/format';

/**
 * Cinco estrellas con la nota (de 0 a 5, con decimales: se redondea a la media estrella más
 * cercana por abajo). Para los lectores de pantalla, "4,5 de 5 estrellas".
 *
 *   <ui-rating-stars [value]="review.rating" />
 */
@Component({
  selector: 'ui-rating-stars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="stars" role="img" [attr.aria-label]="label()">
      <span class="fill" [style.width.%]="percent()" aria-hidden="true">★★★★★</span>
      <span aria-hidden="true">★★★★★</span>
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
      vertical-align: middle;
    }

    .stars {
      position: relative;
      display: inline-block;
      color: var(--color-border-strong);
      letter-spacing: 1px;
      line-height: 1;
      white-space: nowrap;
    }

    .fill {
      position: absolute;
      inset: 0 auto 0 0;
      overflow: hidden;
      color: var(--color-warning);
    }
  `,
})
export class RatingStarsComponent {
  readonly value = input.required<number>();

  protected readonly percent = computed(() => (Math.floor(Math.max(0, Math.min(5, this.value())) * 2) / 2) * 20);
  protected readonly label = computed(() => `${formatNumber(this.value())} de 5 estrellas`);
}
