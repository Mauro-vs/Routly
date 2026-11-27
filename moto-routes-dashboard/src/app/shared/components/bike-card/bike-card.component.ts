import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BIKE_TYPE_LABELS, BikeSummary, bikeName } from '../../../core/models/bike.model';
import { RouterPath } from '../../utils/router';
import { IconComponent } from '../icon/icon.component';

/**
 * Ficha compacta de una moto: portada, nombre, tipo, cc, cv y carnet. El carnet es el que da
 * la API. Con `link`, el nombre lleva a su detalle; lo que se proyecte va debajo, como
 * acciones.
 *
 *   <ui-bike-card [bike]="moto" [link]="['/bikes', moto.slug]" note="Moto de la experiencia" />
 */
@Component({
  selector: 'ui-bike-card',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bike-card.component.html',
  styleUrl: './bike-card.component.css',
})
export class BikeCardComponent {
  readonly bike = input.required<BikeSummary>();
  readonly link = input<RouterPath | null>(null);
  /** Una aclaración bajo la ficha, por ejemplo que es la heredada de la experiencia. */
  readonly note = input('');

  protected readonly name = computed(() => bikeName(this.bike()));
  protected readonly type = computed(() => BIKE_TYPE_LABELS[this.bike().type]);
}
