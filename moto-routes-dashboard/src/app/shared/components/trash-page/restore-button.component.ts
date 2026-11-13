import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

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
  template: `
    <button
      type="button"
      class="btn btn--secondary btn--sm"
      [attr.aria-label]="'Restaurar ' + label()"
      [attr.aria-describedby]="blockedReason() ? reasonId : null"
      [disabled]="busy() || !!blockedReason()"
      (click)="restore.emit()"
    >
      <ui-icon name="arrow-counter-clockwise" />Restaurar
    </button>
    @if (blockedReason(); as reason) {
      <p class="blocked" [id]="reasonId"><ui-icon name="warning-circle" />{{ reason }}</p>
    }
  `,
  styles: `
    :host {
      display: grid;
      justify-items: end;
      gap: 6px;
    }

    /* va con el icono, no solo con el color */
    .blocked {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      max-width: 280px;
      font-size: var(--text-xs);
      font-weight: 500;
      text-align: left;
      white-space: normal;
      color: var(--color-warning);
    }

    .blocked ui-icon {
      flex: none;
      margin-top: 2px;
    }

    @media (max-width: 900px) {
      :host {
        justify-items: start;
      }
    }
  `,
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
