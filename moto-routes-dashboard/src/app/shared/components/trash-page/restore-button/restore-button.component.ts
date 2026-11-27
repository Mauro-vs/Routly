import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IconComponent } from '../../icon/icon.component';

let nextId = 0;

/**
 * Botón "Restaurar" de una fila de la papelera. Si una referencia del registro sigue
 * eliminada (la categoría de una ruta, por ejemplo), la API no lo restaura: el botón
 * se desactiva y el motivo se muestra debajo, enlazado con `aria-describedby`.
 *
 *   <ui-restore-button [label]="ruta.title" [blockedReason]="motivo(ruta)" (restore)="restaurar(ruta)" />
 */
@Component({
  selector: 'ui-restore-button',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './restore-button.component.html',
  styleUrl: './restore-button.component.css',
})
export class RestoreButtonComponent {
  /** Nombre del registro, para el nombre accesible: "Restaurar Costa Brava". */
  readonly label = input.required<string>();
  readonly busy = input(false);
  /** Por qué no se puede restaurar todavía. null: se puede. */
  readonly blockedReason = input<string | null>(null);
  readonly restore = output<void>();

  protected readonly reasonId = `restore-reason-${nextId++}`;
}
