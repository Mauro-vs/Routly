import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface StatItem {
  label: string;
  /** Parte del total, de 0 a 1: añade un medidor por tramos. */
  share?: number;
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
          @if (item.share !== undefined) {
            <dd class="meter" aria-hidden="true"><i [style.width.%]="item.share * 100"></i></dd>
          }
        </div>
      }
    </dl>
  `,
  styles: `
    .strip {
      display: grid;
      margin: 0;
    }

    .stat {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: baseline;
      gap: 2px var(--space-3);
      padding: 10px 0;
      border-bottom: 1px solid var(--color-border);
    }

    dt {
      grid-column: 2;
      grid-row: 1;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      text-align: right;
    }

    dd {
      margin: 0;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .value {
      font-size: 1.625rem;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }

    .unit {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .note {
      grid-column: 1 / -1;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .meter {
      grid-column: 1 / -1;
      display: block;
      height: 8px;
      margin-top: 4px;
      background: repeating-linear-gradient(90deg, var(--color-meter-track) 0 11px, transparent 11px 13px);
    }

    .meter i {
      display: block;
      height: 100%;
      background: repeating-linear-gradient(90deg, var(--color-meter) 0 11px, transparent 11px 13px);
    }
  `,
})
export class StatStripComponent {
  readonly items = input.required<readonly StatItem[]>();
}
