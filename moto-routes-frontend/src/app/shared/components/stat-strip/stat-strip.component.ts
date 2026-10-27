import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface StatItem {
  label: string;
  /** Ya formateado: "860", "4". */
  value: string;
  /** Unidad o contexto pegado a la cifra: "km", "de 5". */
  unit?: string;
  /** Una línea debajo, más discreta: "las 3 próximas salidas". */
  note?: string;
}

/**
 * Franja de cifras del Dashboard: varias métricas en una sola tarjeta, separadas por
 * líneas finas. Es una lista de definiciones, así que se lee bien con lector de
 * pantalla ("Kilómetros en catálogo: 860 km").
 *
 *   <ui-stat-strip [items]="[{ label: 'Rutas activas', value: '4', unit: 'de 5' }]" />
 */
@Component({
  selector: 'ui-stat-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dl class="strip">
      @for (item of items(); track item.label) {
        <div class="stat">
          <dt>{{ item.label }}</dt>
          <dd>
            <span class="value">{{ item.value }}</span>
            @if (item.unit) {
              <span class="unit">{{ item.unit }}</span>
            }
          </dd>
          @if (item.note) {
            <dd class="note">{{ item.note }}</dd>
          }
        </div>
      }
    </dl>
  `,
  styles: `
    .strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      margin: 0;
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow:
        inset 0 0 0 1px var(--color-border),
        var(--shadow-1);
      overflow: hidden;
    }

    .stat {
      display: grid;
      align-content: start;
      gap: 6px;
      padding: 16px 20px 18px;
      /* línea fina entre cifras, también cuando la rejilla salta de fila */
      box-shadow:
        -1px 0 0 var(--color-border),
        0 -1px 0 var(--color-border);
    }

    dt {
      font-size: var(--text-xs);
      font-weight: 500;
      color: var(--color-text-muted);
    }

    dd {
      margin: 0;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .value {
      font-size: 1.75rem;
      font-weight: 650;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }

    .unit {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .note {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    /* En dos columnas, una cifra suelta al final ocupa la fila entera: sin huecos. */
    @media (max-width: 560px) {
      .strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .stat:last-child:nth-child(odd) {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class StatStripComponent {
  readonly items = input.required<readonly StatItem[]>();
}
