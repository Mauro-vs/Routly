import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ShopDeparture } from '../../../../core/api/shop.models';
import { formatPrice, formatTime, formatWeekdayDate, plural } from '../../../../shared/utils/shop-format';

let nextId = 0;

const DAY = new Intl.DateTimeFormat('es-ES', { day: 'numeric' });
const MONTH = new Intl.DateTimeFormat('es-ES', { month: 'short' });
const WEEKDAY = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });
const clean = (text: string) => text.replace('.', '');

/**
 * La elección de salida: un grupo de radios (con el teclado, las flechas cambian de salida), cada
 * una con forma de billete. A la izquierda, la matriz con la fecha en grande; una perforación; y el
 * cuerpo con la hora de salida y de llegada, las plazas libres y el precio. La elegida lleva el
 * contorno sólido y el sello lima; las demás, el contorno discontinuo. Una completa se ve,
 * atenuada y con su sello, pero no se puede elegir.
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
          <span class="stub num" aria-hidden="true">
            <span class="weekday">{{ weekday(departure.startAt) }}</span>
            <strong>{{ day(departure.startAt) }}</strong>
            <span class="month">{{ month(departure.startAt) }}</span>
          </span>
          <span class="body">
            <span class="sr-only">{{ weekdayDate(departure.startAt) }}, </span>
            <span class="time num">{{ time(departure.startAt) }} <span class="arrow" aria-hidden="true">→</span> {{ time(departure.endAt) }}</span>
            <span class="seats num">
              @if (departure.isFull) {
                <span class="stamp stamp--full">Completa</span>
              } @else {
                {{ plural(departure.seatsLeft, 'plaza libre', 'plazas libres') }}
              }
            </span>
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

    /* El billete: la matriz, la perforación (una línea discontinua con dos muescas) y el cuerpo */
    .ticket {
      --stub: 72px;
      position: relative;
      display: grid;
      grid-template-columns: var(--stub) minmax(0, 1fr) auto;
      align-items: center;
      min-height: 84px;
      border: 2px dashed var(--color-border-strong);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      cursor: pointer;
      transition:
        border-color var(--motion-fast) var(--motion-ease),
        background-color var(--motion-fast) var(--motion-ease),
        transform var(--motion-base) var(--motion-ease);
    }

    .ticket::before,
    .ticket::after {
      content: '';
      position: absolute;
      left: calc(var(--stub) - 9px);
      width: 16px;
      height: 16px;
      border-radius: 50%;
      /* Del color de lo que hay detrás del billete: quien lo pone en un panel lo cambia */
      background: var(--notch-bg, var(--color-bg));
    }

    .ticket::before {
      top: -9px;
    }

    .ticket::after {
      bottom: -9px;
    }

    @media (hover: hover) and (pointer: fine) {
      .ticket:hover:not(.is-full) {
        border-color: var(--color-primary);
        transform: translateX(3px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ticket:hover:not(.is-full) {
        transform: none;
      }
    }

    /* La elegida: contorno sólido, un poco del color de la marca y el sello lima */
    .ticket.is-selected {
      border-style: solid;
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
    }

    .ticket:has(input:focus-visible) {
      outline: 3px solid var(--color-accent);
      outline-offset: 3px;
    }

    .ticket.is-full {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .stub {
      display: grid;
      justify-items: center;
      align-self: stretch;
      align-content: center;
      border-right: 2px dashed var(--color-border-strong);
      text-transform: uppercase;
      line-height: 1;
    }

    .is-selected .stub {
      border-right-color: var(--color-primary);
    }

    .weekday,
    .month {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }

    .stub strong {
      margin: 3px 0;
      font-size: 28px;
      font-weight: 850;
      letter-spacing: -0.03em;
    }

    .body {
      display: grid;
      gap: 4px;
      min-width: 0;
      padding: var(--space-3) var(--space-4);
    }

    .time {
      font-size: 17px;
      font-weight: 800;
    }

    .arrow {
      color: var(--color-primary);
    }

    .seats {
      font-size: var(--text-sm);
      font-weight: 650;
      color: var(--color-text-muted);
    }

    .price {
      padding-right: var(--space-4);
      font-size: 24px;
      font-weight: 850;
      letter-spacing: -0.02em;
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
      animation: stamp-in 220ms var(--motion-ease) both;
    }

    /* Como un sello: llega un poco más grande y se asienta */
    @keyframes stamp-in {
      from {
        opacity: 0;
        transform: skewX(var(--slant)) scale(1.35);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .stamp--chosen {
        animation: none;
      }
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
  protected readonly day = (iso: string) => DAY.format(new Date(iso));
  protected readonly month = (iso: string) => clean(MONTH.format(new Date(iso)));
  protected readonly weekday = (iso: string) => clean(WEEKDAY.format(new Date(iso)));
  protected readonly time = formatTime;
  protected readonly price = formatPrice;
  protected readonly plural = plural;
}
