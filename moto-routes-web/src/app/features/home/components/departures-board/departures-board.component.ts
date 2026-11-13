import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ShopExperience } from '../../../../core/api/shop.models';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { formatKm, formatPrice, formatTime } from '../../../../shared/utils/shop-format';

const DAY = new Intl.DateTimeFormat('es-ES', { day: 'numeric' });
const MONTH = new Intl.DateTimeFormat('es-ES', { month: 'short' });
const WEEKDAY = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });

/**
 * Las próximas salidas, como el tablón de salidas de una estación: una fila por experiencia, de la
 * más próxima a la más lejana, con la fecha en grande, el recorrido, los km y el precio. Cada fila
 * lleva a su detalle.
 */
@Component({
  selector: 'app-departures-board',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="board" aria-labelledby="salidas-titulo">
      <header class="head">
        <h2 id="salidas-titulo">Próximas salidas</h2>
        <a class="all" routerLink="/experiencias" [queryParams]="{ 'con-fechas': 'si', orden: 'proximas' }">
          Ver todas <ui-icon name="arrow-right" />
        </a>
      </header>
      <ol class="rows">
        @for (experience of experiences(); track experience._id) {
          @if (experience.nextDepartureAt; as next) {
            <li>
              <a class="row" [routerLink]="['/experiencias', experience.slug]">
                <span class="date num" aria-hidden="true">
                  <span class="weekday">{{ weekday(next) }}</span>
                  <strong>{{ day(next) }}</strong>
                  <span class="month">{{ month(next) }}</span>
                </span>
                <span class="what">
                  <span class="title">{{ experience.title }}</span>
                  @if (experience.route; as route) {
                    <span class="trip">
                      {{ route.startLocation?.city }}
                      @if (route.endLocation && route.endLocation.city !== route.startLocation?.city) {
                        <ui-icon name="arrow-right" class="to" />{{ route.endLocation.city }}
                      }
                      <span class="sep" aria-hidden="true">·</span>
                      <span class="num">{{ km(route.distance) }} km</span>
                      <span class="sep" aria-hidden="true">·</span>
                      <span class="num">{{ time(next) }}</span>
                    </span>
                  }
                </span>
                <span class="sr-only">Sale el {{ weekday(next) }} {{ day(next) }} de {{ month(next) }}.</span>
                @if (experience.priceFrom !== null) {
                  <span class="price num"><span class="from">desde</span> {{ price(experience.priceFrom) }}</span>
                }
                <ui-icon name="arrow-right" class="go" />
              </a>
            </li>
          }
        }
      </ol>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-4);
    }

    h2 {
      font-size: clamp(26px, 3vw, 34px);
      font-weight: 850;
      letter-spacing: -0.03em;
      color: var(--color-on-band);
    }

    .all {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--color-accent);
      font-weight: 750;
      text-decoration: none;
    }

    .all:hover {
      text-decoration: underline;
      text-underline-offset: 4px;
    }

    /* El tablón: filas separadas por un filete, como las de una estación */
    .rows {
      display: grid;
      margin: 0;
      padding: 0;
      list-style: none;
      border-radius: var(--radius-lg);
      overflow: hidden;
      background: rgb(0 0 0 / 0.22);
      box-shadow: inset 0 0 0 1px var(--sign-rule);
    }

    li + li {
      border-top: 1px solid rgb(255 255 255 / 0.12);
    }

    .row {
      display: grid;
      grid-template-columns: 76px minmax(0, 1fr) auto 24px;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-3) var(--space-4);
      color: var(--color-on-band);
      text-decoration: none;
      transition: background-color var(--motion-base) var(--motion-ease);
    }

    .row:focus-visible {
      outline: 3px solid var(--color-accent);
      outline-offset: -3px;
    }

    /* La fecha: una placa blanca con el capuchón lima, como el hito */
    .date {
      display: grid;
      justify-items: center;
      padding: 4px 0 6px;
      border-radius: 5px;
      background: var(--plate-paper);
      color: var(--plate-ink);
      box-shadow: inset 0 4px 0 var(--color-accent);
      text-transform: uppercase;
      line-height: 1;
    }

    .weekday,
    .month {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
    }

    .weekday {
      margin-top: 6px;
      color: rgb(15 26 21 / 0.6);
    }

    .date strong {
      margin: 2px 0;
      font-size: 30px;
      font-weight: 850;
      letter-spacing: -0.03em;
    }

    .what {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .title {
      overflow: hidden;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.01em;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .trip {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0 6px;
      font-size: var(--text-sm);
      color: var(--color-on-band-muted);
    }

    .to {
      font-size: 13px;
      color: var(--color-accent);
    }

    .sep {
      opacity: 0.6;
    }

    .price {
      font-size: 22px;
      font-weight: 850;
      letter-spacing: -0.02em;
      white-space: nowrap;
    }

    .from {
      font-size: 12px;
      font-weight: 650;
      color: var(--color-on-band-muted);
    }

    .go {
      color: var(--color-accent);
      font-size: 20px;
      transition: transform var(--motion-base) var(--motion-ease);
    }

    @media (hover: hover) and (pointer: fine) {
      .row:hover {
        background: rgb(255 255 255 / 0.06);
      }

      .row:hover .go {
        transform: translateX(4px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .row:hover .go {
        transform: none;
      }
    }

    @media (max-width: 640px) {
      .row {
        grid-template-columns: 64px minmax(0, 1fr) auto;
        gap: var(--space-3);
      }

      .go {
        display: none;
      }

      .title {
        white-space: normal;
      }

      .price {
        font-size: 18px;
      }
    }
  `,
})
export class DeparturesBoardComponent {
  readonly experiences = input.required<ShopExperience[]>();

  protected readonly day = (iso: string) => DAY.format(new Date(iso));
  protected readonly month = (iso: string) => MONTH.format(new Date(iso)).replace('.', '');
  protected readonly weekday = (iso: string) => WEEKDAY.format(new Date(iso)).replace('.', '');
  protected readonly time = formatTime;
  protected readonly km = formatKm;
  protected readonly price = formatPrice;
}
