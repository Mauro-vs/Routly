import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Departure } from '../../../../core/models/departure.model';
import { Route, routeTrip } from '../../../../core/models/route.model';
import { LevelMeterComponent } from '../../../../shared/components/level-meter/level-meter.component';
import { RouteGlyphComponent } from '../../../../shared/components/route-glyph/route-glyph.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { formatMoney, formatNumber } from '../../../../shared/utils/format';
import { daysUntil, seats, shortDate } from '../../dashboard-format';

/** La columna de la agenda: las próximas salidas y las últimas rutas modificadas. */
@Component({
  selector: 'app-dashboard-agenda',
  imports: [RouterLink, LevelMeterComponent, RouteGlyphComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="agenda">
      <header class="sheet-head">
        <h2 id="agenda">Agenda</h2>
        <a routerLink="/departures">Ver todas</a>
      </header>
      @if (departures().length === 0) {
        <p class="quiet">No hay salidas programadas a partir de hoy.</p>
      } @else {
        <ol class="road">
          @for (departure of departures(); track departure._id) {
            <li>
              <span class="road__mark">
                <b class="slanted">+{{ days(departure.startAt) }} d</b>
                <time [attr.datetime]="departure.startAt">{{ date(departure.startAt) }}</time>
              </span>
              <ui-route-glyph />
              <div class="road__text">
                <a class="link" [routerLink]="['/departures', departure.slug]">
                  {{ departure.experience?.title ?? 'Salida' }}
                </a>
                <small>{{ seats(departure.capacity) }} · {{ money(departure.price) }}</small>
              </div>
              <ui-status-badge status="scheduled" gender="f" />
            </li>
          }
        </ol>
      }
    </section>

    <section aria-labelledby="recent">
      <header class="sheet-head">
        <h2 id="recent">Últimas rutas modificadas</h2>
        <a routerLink="/routes">Ver todas</a>
      </header>
      <ul class="road">
        @for (route of routes(); track route._id) {
          <li [class.is-off]="!route.isActive">
            <span class="road__mark">
              <b class="slanted">{{ number(route.distance) }}</b>
              <span>km · {{ number(route.duration) }} h</span>
            </span>
            <ui-route-glyph [difficulty]="route.difficulty" />
            <div class="road__text">
              <a class="link" [routerLink]="['/routes', route.slug]">{{ route.title }}</a>
              <small>{{ trip(route) }}</small>
            </div>
            <ui-level-meter [difficulty]="route.difficulty" />
          </li>
        }
      </ul>
    </section>
  `,
  styleUrls: ['../dashboard-sheet.css', './dashboard-agenda.component.css'],
})
export class DashboardAgendaComponent {
  /** Las próximas salidas programadas, de la más cercana a la más lejana. */
  readonly departures = input.required<readonly Departure[]>();
  /** Las últimas rutas modificadas. */
  readonly routes = input.required<readonly Route[]>();
  /** Momento de la última carga: los días se cuentan desde aquí. */
  readonly loadedAt = input.required<Date>();

  protected readonly date = shortDate;
  protected readonly seats = seats;
  protected readonly money = formatMoney;
  protected readonly number = formatNumber;

  protected days(iso: string): number {
    return daysUntil(iso, this.loadedAt());
  }

  protected trip(route: Route): string {
    return routeTrip(route).text;
  }
}
