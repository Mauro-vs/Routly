import { ChangeDetectionStrategy, Component, booleanAttribute, input, model } from '@angular/core';

import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icons.generated';

export interface SegmentOption<T> {
  value: T;
  label: string;
  /** Número que acompaña a la etiqueta, por ejemplo cuántos registros hay. */
  count?: number;
  /** Con icono, la etiqueta solo se lee con lector de pantalla. */
  icon?: IconName;
}

/**
 * Grupo de botones para elegir una opción entre pocas: el filtro
 * activas/inactivas/todas o el cambio entre tarjetas y lista.
 */
@Component({
  selector: 'ui-segmented',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './segmented.component.html',
  styleUrl: './segmented.component.css',
  host: { '[class.is-stretch]': 'stretch()' },
})
export class SegmentedComponent<T> {
  /** En móvil, a todo el ancho. Para el filtro por estado. */
  readonly stretch = input(false, { transform: booleanAttribute });
  readonly options = input.required<readonly SegmentOption<T>[]>();
  readonly value = model.required<T>();
  /** Nombre accesible del grupo, por ejemplo "Filtrar por estado". */
  readonly label = input.required<string>();
}
