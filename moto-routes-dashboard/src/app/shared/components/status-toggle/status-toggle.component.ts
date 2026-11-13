import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { CollectionLabels, capitalize, statusWord } from '../../utils/labels';
import { IconComponent } from '../icon/icon.component';
import { TipComponent } from '../tip/tip.component';
import { ToggleComponent } from '../toggle/toggle.component';

/**
 * Interruptor de activo con su estado escrito al lado ("Activa" o "Inactiva"), el
 * mismo en todos los listados y en el detalle. El cambio es optimista: lo aplica
 * el store y, si la API lo rechaza, el interruptor vuelve solo a su sitio.
 *
 * Si la API no deja cambiarlo (un rol base, por ejemplo), `lockedReason` lo bloquea
 * con un candado y explica el motivo al pasar el ratón o llegar con el teclado.
 *
 *   <ui-status-toggle [active]="ruta.isActive" [label]="ruta.title" [labels]="labels"
 *     (activeChange)="store.setActive(ruta, $event)" />
 */
@Component({
  selector: 'ui-status-toggle',
  imports: [IconComponent, TipComponent, ToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-tip #tip [text]="lockedReason()">
      <ui-toggle
        [checked]="active()"
        [label]="toggleLabel()"
        [disabled]="busy()"
        [locked]="!!lockedReason()"
        [describedBy]="tip.describedBy()"
        (checkedChange)="activeChange.emit($event)"
      />
    </ui-tip>
    <span class="state" [class.state--off]="!active()" aria-hidden="true">{{ word() }}</span>
    @if (lockedReason()) {
      <ui-icon class="lock" name="lock-simple" />
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      white-space: nowrap;
    }

    .state {
      font-size: var(--text-sm);
      font-weight: 500;
    }

    .state--off {
      color: var(--color-text-muted);
    }

    .lock {
      margin-left: -4px;
      font-size: 15px;
      color: var(--color-text-muted);
    }
  `,
})
export class StatusToggleComponent {
  readonly active = input.required<boolean>();
  /** Nombre del registro, para el nombre accesible: "Ruta activa: Costa Brava". */
  readonly label = input.required<string>();
  readonly labels = input.required<CollectionLabels>();
  /** Hay un cambio en curso para este registro. */
  readonly busy = input(false);
  /** Por qué no se puede cambiar. null: se puede. */
  readonly lockedReason = input<string | null>(null);
  readonly activeChange = output<boolean>();

  protected readonly word = computed(() =>
    capitalize(statusWord(this.active() ? 'active' : 'inactive', this.labels().gender)),
  );
  protected readonly toggleLabel = computed(() => {
    const { singular, gender } = this.labels();
    return `${capitalize(singular)} ${statusWord('active', gender)}: ${this.label()}`;
  });
}
