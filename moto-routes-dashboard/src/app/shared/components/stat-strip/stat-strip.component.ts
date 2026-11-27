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
  templateUrl: './stat-strip.component.html',
  styleUrl: './stat-strip.component.css',
})
export class StatStripComponent {
  readonly items = input.required<readonly StatItem[]>();
}
