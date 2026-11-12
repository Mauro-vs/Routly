import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

export interface ActiveFilter {
  /** Qué filtro es (el parámetro de la URL) */
  key: string;
  /** Lo que se enseña: "Montaña", "«costa»"... */
  label: string;
}

/**
 * Los filtros puestos, a la vista: cada uno se quita con su botón, y todos a la vez con
 * "Quitar los filtros". No sabe qué filtran: emite la clave del que se quita.
 */
@Component({
  selector: 'ui-active-filters',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (filters().length > 0) {
      <ul aria-label="Filtros puestos">
        @for (filter of filters(); track filter.key) {
          <li>
            <span>{{ filter.label }}</span>
            <button type="button" [attr.aria-label]="'Quitar el filtro ' + filter.label" (click)="remove.emit(filter.key)">
              <ui-icon name="x" />
            </button>
          </li>
        }
      </ul>
      <button type="button" class="clear-all" (click)="clear.emit()">Quitar los filtros</button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }

    ul {
      display: contents;
    }

    li {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      height: 36px;
      padding-left: var(--space-3);
      border-radius: var(--radius-sm);
      background: var(--color-primary-soft);
      font-size: var(--text-sm);
      font-weight: 650;
    }

    li button {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border: 0;
      border-radius: var(--radius-sm);
      background: none;
      font-size: 14px;
      cursor: pointer;
    }

    li button:hover {
      background: color-mix(in srgb, var(--color-text) 10%, transparent);
    }

    .clear-all {
      min-height: 36px;
      padding: 0 var(--space-2);
      border: 0;
      background: none;
      color: var(--color-primary);
      font-size: var(--text-sm);
      font-weight: 650;
      text-decoration: underline;
      text-underline-offset: 3px;
      cursor: pointer;
    }
  `,
})
export class ActiveFiltersComponent {
  readonly filters = input.required<ActiveFilter[]>();
  readonly remove = output<string>();
  readonly clear = output<void>();
}
