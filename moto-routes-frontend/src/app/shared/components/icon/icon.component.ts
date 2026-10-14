import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ICONS, IconName } from './icons.generated';

/**
 * Icono de Phosphor. Hereda el color del texto y mide 1em, así que su tamaño se
 * ajusta con `font-size`. Es decorativo: el texto accesible lo pone quien lo usa.
 */
@Component({
  selector: 'ui-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg viewBox="0 0 256 256" fill="currentColor" focusable="false">
    <path [attr.d]="path()" />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      width: 1em;
      height: 1em;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
  host: { 'aria-hidden': 'true' },
})
export class IconComponent {
  readonly name = input.required<IconName>();

  protected readonly path = computed(() => ICONS[this.name()]);
}
