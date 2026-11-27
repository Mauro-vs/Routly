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
  templateUrl: './departures-board.component.html',
  styleUrl: './departures-board.component.css',
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
