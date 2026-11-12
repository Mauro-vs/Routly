import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ShopDeparture } from '../../../../core/api/shop.models';
import { formatPrice, formatTime, formatWeekdayDate, plural } from '../../../../shared/utils/shop-format';

let nextId = 0;

/**
 * La elección de salida: un grupo de radios (con el teclado, las flechas cambian de salida), cada
 * una con forma de billete: la fecha, la hora de salida y de llegada, las plazas libres y el precio.
 * La elegida lleva el contorno sólido y el sello lima; las demás, el contorno discontinuo. Una
 * completa se ve, atenuada y con su sello, pero no se puede elegir.
 */
@Component({
  selector: 'app-departure-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="radiogroup" [attr.aria-labelledby]="labelledBy()" class="tickets">
      @for (departure of departures(); track departure._id) {
        <label class="ticket" [class.is-selected]="departure.slug === selectedSlug()" [class.is-full]="departure.isFull">
          <input
            type="radio"
            class="sr-only"
            [name]="name"
            [value]="departure.slug"
            [checked]="departure.slug === selectedSlug()"
            [disabled]="departure.isFull"
            (change)="select.emit(departure.slug)"
          />
          <span class="date">
            <strong>{{ weekdayDate(departure.startAt) }}</strong>
            <span class="num">{{ time(departure.startAt) }} – {{ time(departure.endAt) }}</span>
          </span>
          <span class="seats num">
            @if (departure.isFull) {
              <span class="stamp stamp--full">Completa</span>
            } @else {
              {{ plural(departure.seatsLeft, 'plaza libre', 'plazas libres') }}
            }
          </span>
          <span class="price num">{{ price(departure.price) }}<span class="sr-only"> por persona</span></span>
          @if (departure.slug === selectedSlug()) {
            <span class="stamp stamp--chosen" aria-hidden="true">Elegida</span>
          }
        </label>
      }
    </div>
  `,
  styles: `
    .tickets {
      display: grid;
      gap: var(--space-3);
    }

    .ticket {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas: 'date price' 'seats price';
      align-items: center;
      gap: 2px var(--space-3);
      min-height: 72px;
      padding: var(--space-3) var(--space-4);
      border: 2px dashed var(--color-border-strong);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      cursor: pointer;
      transition:
        border-color var(--motion-fast),
        background var(--motion-fast);
    }

    .ticket:hover:not(.is-full) {
      border-color: var(--color-primary);
    }

    /* La elegida: contorno sólido y el sello lima */
    .ticket.is-selected {
      border-style: solid;
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
    }

    .ticket:has(input:focus-visible) {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    .ticket.is-full {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .date {
      grid-area: date;
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0 var(--space-3);
    }

    .date strong {
      display: inline-block;
      font-size: 18px;
      font-weight: 800;
    }

    /* "mar, 17 nov" → "Mar, 17 nov": solo la primera letra (el mes va en minúscula) */
    .date strong::first-letter {
      text-transform: uppercase;
    }

    .date span {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .seats {
      grid-area: seats;
      font-size: var(--text-sm);
      font-weight: 650;
    }

    .price {
      grid-area: price;
      font-size: 22px;
      font-weight: 850;
      letter-spacing: -0.01em;
    }

    .stamp {
      display: inline-block;
      padding: 1px 10px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .stamp--full {
      background: var(--color-text);
      color: var(--color-bg);
      transform: skewX(var(--slant));
    }

    .stamp--chosen {
      position: absolute;
      top: -11px;
      right: var(--space-4);
      background: var(--color-accent);
      color: var(--color-on-accent);
      transform: skewX(var(--slant));
    }
  `,
})
export class DeparturePickerComponent {
  readonly departures = input.required<ShopDeparture[]>();
  readonly selectedSlug = input<string | null>(null);
  /** El id del título que nombra el grupo */
  readonly labelledBy = input.required<string>();
  readonly select = output<string>();

  protected readonly name = `departure-${nextId++}`;
  protected readonly weekdayDate = formatWeekdayDate;
  protected readonly time = formatTime;
  protected readonly price = formatPrice;
  protected readonly plural = plural;
}
