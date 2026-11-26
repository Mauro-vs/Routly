import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Rating } from '../../../core/models/review.model';
import { formatNumber } from '../../utils/format';
import { RatingStarsComponent } from './rating-stars.component';

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
  template: `
    <div class="rating">
      @if (label()) {
        <span class="label">{{ label() }}</span>
      }
      @if (count() > 0) {
        <span class="value">
          <strong class="average">{{ average() }}</strong>
          <ui-rating-stars [value]="rating()?.average ?? 0" />
          <span class="muted">{{ count() }} {{ count() === 1 ? 'opinión' : 'opiniones' }}</span>
        </span>
      } @else {
        <span class="muted">Sin opiniones todavía</span>
      }
      @if (targetId(); as id) {
        @if (count() > 0) {
          <a class="link" routerLink="/reviews" [queryParams]="{ sobre: id }">Ver sus opiniones</a>
        }
      }
    </div>
  `,
  styles: `
    .rating {
      display: grid;
      gap: 4px;
    }

    .label {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .value {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .average {
      font-size: 1.5rem;
      font-variant-numeric: tabular-nums;
    }

    .link {
      justify-self: start;
    }
  `,
})
export class RatingSummaryComponent {
  readonly rating = input<Rating | null | undefined>(null);
  readonly label = input('');
  /** Con él, el enlace a sus opiniones */
  readonly targetId = input<string | null>(null);

  protected readonly count = computed(() => this.rating()?.count ?? 0);
  protected readonly average = computed(() => formatNumber(this.rating()?.average ?? 0));
}
