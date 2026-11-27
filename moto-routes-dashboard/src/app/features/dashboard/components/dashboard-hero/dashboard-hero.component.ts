import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Departure } from '../../../../core/models/departure.model';
import { RouteGlyphComponent } from '../../../../shared/components/route-glyph/route-glyph.component';
import { formatMoney } from '../../../../shared/utils/format';
import { daysUntil, seats, shortDate } from '../../dashboard-format';

/** Lo primero del Dashboard: cuántos días faltan para la próxima salida. */
@Component({
  selector: 'app-dashboard-hero',
  imports: [RouterLink, RouteGlyphComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-hero.component.html',
  styleUrls: ['../dashboard-sheet.css', './dashboard-hero.component.css'],
})
export class DashboardHeroComponent {
  /** La próxima salida programada, o null si no hay ninguna. */
  readonly departure = input.required<Departure | null>();
  /** Momento de la última carga: los días se cuentan desde aquí. */
  readonly loadedAt = input.required<Date>();

  protected readonly days = computed(() => {
    const departure = this.departure();
    return departure ? daysUntil(departure.startAt, this.loadedAt()) : 0;
  });

  protected readonly date = shortDate;
  protected readonly seats = seats;
  protected readonly money = formatMoney;
}
