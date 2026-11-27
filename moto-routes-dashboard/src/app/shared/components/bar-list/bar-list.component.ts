import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarItem {
  label: string;
  value: number;
}

/**
 * Barras horizontales de una sola serie: cuántos hay de cada cosa (rutas por
 * categoría, por dificultad...). Cada fila lleva su nombre y su cifra en texto, así
 * que no depende del color ni de pasar el ratón; la barra es decoración
 * (`aria-hidden`). El orden es el de `items`.
 *
 *   <ui-bar-list label="Rutas por categoría" [items]="porCategoria()" unit="rutas" />
 */
@Component({
  selector: 'ui-bar-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bar-list.component.html',
  styleUrl: './bar-list.component.css',
})
export class BarListComponent {
  readonly items = input.required<readonly BarItem[]>();
  /** Nombre de la lista para el lector de pantalla. */
  readonly label = input.required<string>();
  /** Lo que se cuenta, para el nombre accesible de cada fila: "rutas". */
  readonly unit = input('');
  readonly emptyText = input('Todavía no hay datos.');

  protected readonly rows = computed(() => {
    const max = Math.max(0, ...this.items().map((item) => item.value));
    return this.items().map((item) => ({
      ...item,
      share: max > 0 ? (item.value / max) * 100 : 0,
    }));
  });
}
