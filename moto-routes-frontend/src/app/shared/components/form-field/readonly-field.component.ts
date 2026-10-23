import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

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
  template: `
    <span class="label" [id]="labelId">{{ label() }}</span>
    <p class="readonly-value" [attr.aria-labelledby]="labelId" [attr.aria-describedby]="hint() ? hintId : null">
      <ui-icon name="lock-simple" /><span class="value"><ng-content /></span>
    </p>
    @if (hint()) {
      <p class="hint" [id]="hintId">{{ hint() }}</p>
    }
  `,
  styles: `
    :host {
      display: grid;
      align-content: start;
      gap: 6px;
      min-width: 0;
    }

    .label {
      font-size: var(--text-sm);
      font-weight: 600;
    }

    .value {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .hint {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
  `,
})
export class ReadonlyFieldComponent {
  readonly label = input.required<string>();
  /** Por qué no se puede cambiar. */
  readonly hint = input('');

  private readonly uid = nextId++;
  protected readonly labelId = `readonly-${this.uid}`;
  protected readonly hintId = `readonly-${this.uid}-hint`;
}
