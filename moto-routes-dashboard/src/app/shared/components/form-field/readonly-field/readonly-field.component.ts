import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../../icon/icon.component';

let nextId = 0;

/**
 * Un dato que se ve en el formulario pero no se puede cambiar al editar: el usuario
 * de un anfitrión, el SKU de una salida... Lleva un candado y el motivo debajo. No se
 * envía a la API (la rechazaría con 400).
 *
 *   <ui-readonly-field label="SKU" hint="El SKU no cambia nunca.">{{ salida.sku }}</ui-readonly-field>
 */
@Component({
  selector: 'ui-readonly-field',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './readonly-field.component.html',
  styleUrl: './readonly-field.component.css',
})
export class ReadonlyFieldComponent {
  readonly label = input.required<string>();
  /** Por qué no se puede cambiar. */
  readonly hint = input('');

  private readonly uid = nextId++;
  protected readonly labelId = `readonly-${this.uid}`;
  protected readonly hintId = `readonly-${this.uid}-hint`;
}
