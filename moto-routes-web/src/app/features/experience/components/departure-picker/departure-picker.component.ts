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
  templateUrl: './departure-picker.component.html',
  styleUrl: './departure-picker.component.css',
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
