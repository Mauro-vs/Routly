// Copiado del panel (moto-routes-dashboard). Si cambia allí, se cambia aquí.
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ICONS, IconName } from './icons.generated';

/**
 * Icono de Phosphor. Hereda el color del texto y mide 1em, así que su tamaño se
 * ajusta con `font-size`. Es decorativo: el texto accesible lo pone quien lo usa.
 */
@Component({
  selector: 'ui-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
  host: { 'aria-hidden': 'true' },
})
export class IconComponent {
  readonly name = input.required<IconName>();

  protected readonly path = computed(() => ICONS[this.name()]);
}
