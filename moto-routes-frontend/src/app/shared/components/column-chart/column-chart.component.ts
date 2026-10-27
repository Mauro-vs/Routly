import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface ChartSeries {
  key: string;
  /** En plural, como en la leyenda: "Programadas". */
  label: string;
  /** En singular y minúscula, para "1 programada". */
  singular: string;
  /** Variable CSS del color: `--color-chart-1`. Las series van siempre en el mismo orden. */
  color: string;
}

export interface ColumnDatum {
  /** Etiqueta del eje: "nov". */
  label: string;
  /** Etiqueta completa para el lector de pantalla y la tabla: "noviembre de 2026". */
  fullLabel: string;
  /** Valor de cada serie, por su `key`. */
  values: Readonly<Record<string, number>>;
}

/**
 * Columnas apiladas (por ejemplo, salidas por mes y por estado). Cumple las reglas de
 * las gráficas del panel:
 * - columnas finas (24 px como mucho), extremo redondeado y separación de 2 px entre
 *   tramos;
 * - leyenda siempre visible con dos o más series, y el total escrito sobre cada
 *   columna;
 * - cada columna se puede enfocar con el teclado y muestra el desglose al pasar el
 *   ratón o al enfocarla; el lector de pantalla lo lee en su nombre accesible;
 * - debajo, la misma información como tabla, para quien la prefiera.
 */
@Component({
  selector: 'ui-column-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (series().length > 1) {
      <ul class="legend" aria-hidden="true">
        @for (serie of series(); track serie.key) {
          <li><span class="swatch" [style.background]="'var(' + serie.color + ')'"></span>{{ serie.label }}</li>
        }
      </ul>
    }

    <ol class="plot" [attr.aria-label]="label()">
      @for (column of columns(); track column.label) {
        <li class="column" tabindex="0" [attr.aria-label]="column.description">
          <span class="total" aria-hidden="true">{{ column.total || '' }}</span>
          <span class="stack" aria-hidden="true" [style.height.%]="column.height">
            @for (part of column.parts; track part.key) {
              <span class="part" [style.flex-grow]="part.value" [style.background]="'var(' + part.color + ')'"></span>
            }
          </span>
          <span class="axis" aria-hidden="true">{{ column.label }}</span>
          <span class="tip" aria-hidden="true">
            <strong>{{ column.fullLabel }}</strong>
            @for (part of column.allParts; track part.key) {
              <span class="tip__row">
                <span class="key" [style.background]="'var(' + part.color + ')'"></span>
                <b>{{ part.value }}</b> {{ part.value === 1 ? part.singular : part.label }}
              </span>
            }
          </span>
        </li>
      }
    </ol>

    <details class="table-view">
      <summary>Ver como tabla</summary>
      <table>
        <caption class="sr-only">{{ label() }}</caption>
        <thead>
          <tr>
            <th scope="col">{{ categoryHeader() }}</th>
            @for (serie of series(); track serie.key) {
              <th scope="col">{{ serie.label }}</th>
            }
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          @for (column of columns(); track column.label) {
            <tr>
              <th scope="row">{{ column.fullLabel }}</th>
              @for (part of column.allParts; track part.key) {
                <td>{{ part.value }}</td>
              }
              <td>{{ column.total }}</td>
            </tr>
          }
        </tbody>
      </table>
    </details>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--space-3);
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 16px;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .legend li {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .swatch {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }

    .plot {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(0, 1fr);
      align-items: end;
      height: 180px;
      margin: 0;
      padding: 0 0 0;
      list-style: none;
      /* línea base fina */
      background: linear-gradient(var(--color-chart-grid), var(--color-chart-grid)) bottom 22px left 0 / 100% 1px no-repeat;
    }

    .column {
      position: relative;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) 22px;
      justify-items: center;
      height: 100%;
      border-radius: var(--radius-sm);
      outline-offset: 2px;
      cursor: default;
      transition: background var(--motion-fast) var(--motion-ease);
    }

    .column:hover,
    .column:focus-visible {
      background: var(--color-surface-2);
    }

    .total {
      align-self: end;
      min-height: 18px;
      font-size: var(--text-xs);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .stack {
      align-self: end;
      display: flex;
      flex-direction: column-reverse;
      gap: 2px;
      width: min(24px, 60%);
      min-height: 0;
      border-radius: 4px 4px 0 0;
      overflow: hidden;
      transform-origin: bottom;
      animation: rise var(--motion-base) var(--motion-ease) both;
    }

    .part {
      flex-basis: 0;
      min-height: 3px;
    }

    .axis {
      align-self: center;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .tip {
      position: absolute;
      bottom: calc(100% - 12px);
      left: 50%;
      z-index: var(--z-tooltip);
      display: grid;
      gap: 4px;
      min-width: 150px;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      background: var(--color-sidebar);
      color: var(--color-on-sidebar);
      font-size: var(--text-xs);
      box-shadow: var(--shadow-2);
      opacity: 0;
      pointer-events: none;
      transform: translate(-50%, 4px);
      transition:
        opacity var(--motion-fast) var(--motion-ease),
        transform var(--motion-fast) var(--motion-ease);
    }

    .column:hover .tip,
    .column:focus-visible .tip {
      opacity: 1;
      transform: translate(-50%, 0);
    }

    .tip strong {
      font-size: var(--text-xs);
      font-weight: 600;
    }

    .tip__row {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--color-on-sidebar-muted);
    }

    .tip__row b {
      color: var(--color-on-sidebar);
      font-variant-numeric: tabular-nums;
    }

    /* clave de línea corta, no un cuadro */
    .key {
      width: 10px;
      height: 2px;
      border-radius: 1px;
    }

    /* en los extremos, el tooltip se alinea con el borde para no salirse */
    .column:first-child .tip {
      left: 0;
      transform: translate(0, 4px);
    }

    .column:last-child .tip {
      left: auto;
      right: 0;
      transform: translate(0, 4px);
    }

    .column:first-child:hover .tip,
    .column:first-child:focus-visible .tip,
    .column:last-child:hover .tip,
    .column:last-child:focus-visible .tip {
      transform: none;
    }

    .table-view {
      overflow-x: auto;
    }

    .table-view summary {
      width: fit-content;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      cursor: pointer;
    }

    .table-view table {
      width: 100%;
      margin-top: var(--space-2);
      border-collapse: collapse;
      font-size: var(--text-xs);
      font-variant-numeric: tabular-nums;
    }

    .table-view th,
    .table-view td {
      padding: 6px 8px;
      border-top: 1px solid var(--color-border);
      text-align: right;
    }

    .table-view th:first-child {
      text-align: left;
    }

    @keyframes rise {
      from {
        transform: scaleY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .stack {
        animation: none;
      }

      .tip {
        transition: none;
      }
    }
  `,
})
export class ColumnChartComponent {
  readonly series = input.required<readonly ChartSeries[]>();
  readonly data = input.required<readonly ColumnDatum[]>();
  /** Nombre de la gráfica para el lector de pantalla: "Salidas por mes". */
  readonly label = input.required<string>();
  /** Cabecera de la primera columna de la tabla: "Mes". */
  readonly categoryHeader = input('Categoría');
  /** Lo que se cuenta, para las descripciones: "salidas" y, en singular, "salida". */
  readonly unit = input('');
  readonly unitOne = input('');

  protected readonly columns = computed(() => {
    const series = this.series();
    const totals = this.data().map((datum) =>
      series.reduce((sum, serie) => sum + (datum.values[serie.key] ?? 0), 0),
    );
    const max = Math.max(0, ...totals);

    return this.data().map((datum, index) => {
      const allParts = series.map((serie) => ({
        key: serie.key,
        label: serie.label.toLowerCase(),
        singular: serie.singular,
        color: serie.color,
        value: datum.values[serie.key] ?? 0,
      }));
      const total = totals[index];
      const detail = allParts
        .filter((part) => part.value > 0)
        .map((part) => `${part.value} ${part.value === 1 ? part.singular : part.label}`)
        .join(', ');
      return {
        label: datum.label,
        fullLabel: datum.fullLabel,
        total,
        height: max > 0 ? (total / max) * 100 : 0,
        parts: allParts.filter((part) => part.value > 0),
        allParts,
        description: `${datum.fullLabel}: ${total} ${total === 1 ? this.unitOne() : this.unit()}${detail ? ` (${detail})` : ''}`,
      };
    });
  });
}
