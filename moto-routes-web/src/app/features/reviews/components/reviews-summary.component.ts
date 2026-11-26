import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Rating } from '../../../core/reviews/reviews.models';
import { StarsComponent } from '../../../shared/ui/stars/stars.component';
import { formatRating, plural } from '../../../shared/utils/shop-format';

/**
 * La cabecera de las opiniones: la media grande con sus estrellas, cuántas hay y una barra por
 * nota, de 5 a 1, con su porcentaje. Cada barra es un botón que filtra la lista por esa nota
 * (y pulsarla otra vez quita el filtro).
 */
@Component({
  selector: 'app-reviews-summary',
  imports: [StarsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="score">
      <p class="average num" aria-hidden="true">{{ average() }}</p>
      <ui-stars [value]="rating().average" />
      <p class="count">{{ count() }}</p>
    </div>
    <ul class="bars" aria-label="Opiniones por estrellas">
      @for (bar of bars(); track bar.stars) {
        <li>
          <button
            type="button"
            [attr.aria-pressed]="activeStars() === bar.stars"
            [disabled]="bar.count === 0 && activeStars() !== bar.stars"
            [attr.aria-label]="bar.stars + ' estrellas: ' + bar.count + ' opiniones (' + bar.percent + ' %). Filtrar'"
            (click)="toggleStars.emit(bar.stars)"
          >
            <span class="label num">{{ bar.stars }} ★</span>
            <span class="track"><span class="fill" [style.width.%]="bar.percent"></span></span>
            <span class="percent num">{{ bar.percent }} %</span>
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: var(--space-5) var(--space-6);
      align-items: center;
    }

    .score {
      display: grid;
      justify-items: start;
      gap: var(--space-1);
      font-size: 20px;
    }

    .average {
      font-size: 56px;
      font-weight: 850;
      letter-spacing: -0.04em;
      line-height: 1;
    }

    .count {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .bars {
      display: grid;
      gap: var(--space-1);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    button {
      display: grid;
      grid-template-columns: 3.2em minmax(0, 1fr) 3.4em;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      min-height: 32px;
      padding: 0 var(--space-2);
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      background: none;
      color: inherit;
      font: inherit;
      font-size: var(--text-sm);
      cursor: pointer;
    }

    button:hover:not(:disabled),
    button[aria-pressed='true'] {
      border-color: var(--color-border-strong);
      background: var(--color-surface-2);
    }

    button:disabled {
      color: var(--color-text-muted);
      cursor: default;
    }

    .track {
      height: 8px;
      overflow: hidden;
      border-radius: var(--radius-pill);
      background: var(--color-meter-track);
    }

    .fill {
      display: block;
      height: 100%;
      background: var(--color-star);
    }

    .percent {
      text-align: right;
      color: var(--color-text-muted);
    }

    @media (max-width: 560px) {
      :host {
        grid-template-columns: 1fr;
      }
    }
  `,
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
