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
  templateUrl: './active-filters.component.html',
  styleUrl: './active-filters.component.css',
})
export class ActiveFiltersComponent {
  readonly filters = input.required<ActiveFilter[]>();
  readonly remove = output<string>();
  readonly clear = output<void>();
}
