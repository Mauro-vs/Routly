import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RouterPath } from '../../utils/router';
import { IconComponent } from '../icon/icon.component';
import { TipComponent } from '../tip/tip.component';

/**
 * Acciones rápidas de una fila: ver el detalle, editar y eliminar. Son botones de
 * solo icono, así que cada uno lleva el nombre del registro en su nombre accesible
 * ("Editar Costa Brava").
 *
 * Si la API no deja eliminarlo, `deleteLockedReason` desactiva el botón y explica el
 * motivo. Sigue recibiendo el foco para poder leerlo.
 *
 *   <ui-row-actions [label]="ruta.title" [detailPath]="['/routes', ruta.slug]"
 *     [editPath]="['/routes', ruta.slug, 'edit']" (remove)="store.confirmAndRemove(ruta)" />
 */
@Component({
  selector: 'ui-row-actions',
  imports: [RouterLink, IconComponent, TipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="icon-btn" [routerLink]="detailPath()" [attr.aria-label]="'Ver ' + label()">
      <ui-icon name="eye" />
    </a>
    @if (editPath(); as editPath) {
      <a class="icon-btn" [routerLink]="editPath" [attr.aria-label]="'Editar ' + label()">
        <ui-icon name="pencil-simple" />
      </a>
    }
    <ui-tip #tip [text]="deleteLockedReason()">
      <button
        type="button"
        class="icon-btn icon-btn--danger"
        [attr.aria-label]="'Eliminar ' + label()"
        [attr.aria-disabled]="deleteLockedReason() ? true : null"
        [attr.aria-describedby]="tip.describedBy()"
        [disabled]="busy()"
        (click)="onRemove()"
      >
        <ui-icon name="trash" />
      </button>
    </ui-tip>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 2px;
    }
  `,
})
export class RowActionsComponent {
  /** Nombre del registro, para los nombres accesibles de los botones. */
  readonly label = input.required<string>();
  readonly detailPath = input.required<RouterPath>();
  /** null: el registro no se edita desde el listado. */
  readonly editPath = input<RouterPath | null>(null);
  readonly busy = input(false);
  /** Por qué no se puede eliminar. null: se puede. */
  readonly deleteLockedReason = input<string | null>(null);
  readonly remove = output<void>();

  protected onRemove(): void {
    if (this.deleteLockedReason()) return;
    this.remove.emit();
  }
}
