import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Rating } from '../../../core/models/review.model';
import { formatNumber } from '../../utils/format';
import { RatingStarsComponent } from './rating-stars/rating-stars.component';

/**
 * La nota de una experiencia, un anfitrión o una ruta en su detalle: la media con sus estrellas,
 * cuántas opiniones y, si se le pasa `targetId`, el enlace a sus opiniones en el panel (el
 * listado filtrado por "Sobre").
 *
 *   <ui-rating-summary label="Como anfitrión" [rating]="host.rating" [targetId]="host._id" />
 */
@Component({
  selector: 'ui-rating-summary',
  imports: [RouterLink, RatingStarsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rating-summary.component.html',
  styleUrl: './rating-summary.component.css',
})
export class RatingSummaryComponent {
  readonly rating = input<Rating | null | undefined>(null);
  readonly label = input('');
  /** Con él, el enlace a sus opiniones */
  readonly targetId = input<string | null>(null);

  protected readonly count = computed(() => this.rating()?.count ?? 0);
  protected readonly average = computed(() => formatNumber(this.rating()?.average ?? 0));
}
