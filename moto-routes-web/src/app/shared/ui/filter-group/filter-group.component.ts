import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface FilterOption {
  value: string;
  label: string;
  /** Cuántos resultados tiene, si se sabe */
  count?: number;
}

let nextId = 0;

/**
 * Un filtro de una sola opción: un grupo de radios con su leyenda, la opción de "todas" primero
 * y, si se sabe, cuántos resultados tiene cada una. Con el teclado, las flechas cambian de
 * opción (es un radio de verdad). No sabe qué filtra: emite el valor elegido, o null.
 */
@Component({
  selector: 'ui-filter-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-group.component.html',
  styleUrl: './filter-group.component.css',
})
export class FilterGroupComponent {
  readonly legend = input.required<string>();
  readonly options = input.required<FilterOption[]>();
  /** La opción que quita el filtro */
  readonly allLabel = input('Todas');
  /** El valor elegido, o null si no se filtra */
  readonly value = model<string | null>(null);

  protected readonly name = `filter-${nextId++}`;
}
