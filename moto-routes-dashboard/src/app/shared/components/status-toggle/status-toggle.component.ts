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
  templateUrl: './status-toggle.component.html',
  styleUrl: './status-toggle.component.css',
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
