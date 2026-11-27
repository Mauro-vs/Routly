import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ShopRoute } from '../../../../core/api/shop.models';
import { DifficultyComponent } from '../../../../shared/ui/difficulty/difficulty.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { formatHours, formatKm } from '../../../../shared/utils/shop-format';

/**
 * El cartel de la ruta: el panel verde de orientación con el origen y el destino como placas de
 * población, y debajo los kilómetros, las horas de conducción, la dificultad y el tipo de carretera.
 */
@Component({
  selector: 'app-route-sign',
  imports: [DifficultyComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './route-sign.component.html',
  styleUrl: './route-sign.component.css',
})
export class RouteSignComponent {
  readonly route = input.required<ShopRoute>();

  protected readonly km = computed(() => formatKm(this.route().distance));
  protected readonly hours = computed(() => formatHours(this.route().duration));
  /** Empieza y acaba en el mismo sitio */
  protected readonly loop = computed(() => this.route().startLocation?.slug === this.route().endLocation?.slug);
}
