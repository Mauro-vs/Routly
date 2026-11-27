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
  templateUrl: './dashboard-agenda.component.html',
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
