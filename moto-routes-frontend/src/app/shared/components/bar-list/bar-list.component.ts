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
  template: `
    <ol class="bars" [attr.aria-label]="label()">
      @for (item of rows(); track item.label) {
        <li class="bar" [attr.aria-label]="item.label + ': ' + item.value + ' ' + unit()">
          <span class="name" [title]="item.label">{{ item.label }}</span>
          <span class="track" aria-hidden="true">
            <span class="fill" [style.width.%]="item.share"></span>
          </span>
          <span class="value" aria-hidden="true">{{ item.value }}</span>
        </li>
      } @empty {
        <li class="empty">{{ emptyText() }}</li>
      }
    </ol>
  `,
  styles: `
    .bars {
      display: grid;
      gap: 4px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .bar {
      display: grid;
      grid-template-columns: minmax(0, 6rem) minmax(0, 1fr) 1.5rem;
      align-items: center;
      gap: 12px;
      min-height: 30px;
      font-size: var(--text-sm);
    }

    .name {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    /* un medidor por tramos, como los de un cuadro de mandos */
    .track,
    .fill {
      display: block;
      height: 8px;
      background: repeating-linear-gradient(90deg, var(--meter-color) 0 11px, transparent 11px 13px);
    }

    .track {
      --meter-color: var(--color-meter-track);
    }

    .fill {
      --meter-color: var(--color-meter);
      min-width: 11px;
    }

    .value {
      font-weight: 600;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .empty {
      padding: 8px 6px;
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

  `,
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
