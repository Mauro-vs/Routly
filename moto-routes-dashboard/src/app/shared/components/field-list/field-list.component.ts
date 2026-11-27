import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { formatDate, formatDateTime, formatMoney, formatNumber, formatRelativeTime } from '../../utils/format';
import { Gender } from '../../utils/labels';
import { RouterPath } from '../../utils/router';
import { IconComponent } from '../icon/icon.component';
import { RelationLinkComponent } from '../relation-link/relation-link.component';
import { BadgeStatus, StatusBadgeComponent } from '../status-badge/status-badge.component';

type FieldFormat =
  | 'text'
  | 'multiline'
  | 'mono'
  | 'number'
  | 'money'
  | 'date'
  | 'datetime'
  | 'relative';

/** Un dato del detalle: su etiqueta y cómo se pinta el valor. */
export interface FieldItem {
  label: string;
  value: string | number | null | undefined;
  /** Por defecto, texto. Las fechas se esperan en ISO 8601. */
  format?: FieldFormat;
  /** Unidad tras un número, por ejemplo "km". */
  unit?: string;
  /** Enlace a otra página del panel. */
  link?: RouterPath | null;
  /** Enlace externo (una URL o un mapa). Se abre en otra pestaña. */
  href?: string | null;
  /**
   * Es un registro relacionado: si `value` es null, ese registro se ha eliminado
   * y se muestra "Eliminado" en vez de "Sin datos".
   */
  relation?: boolean;
  /** Pinta una insignia de estado en vez del valor. */
  status?: BadgeStatus;
  /** Para concertar "Eliminada" o "Activa". */
  gender?: Gender;
  /** Texto cuando no hay valor. Por defecto, "Sin datos". */
  empty?: string;
  /** Ocupa todo el ancho, en la lista de dos columnas. */
  wide?: boolean;
}

const DATE_FORMATS: ReadonlySet<FieldFormat> = new Set(['date', 'datetime', 'relative']);

/** El valor ya formateado, o null si no hay nada que mostrar. */
export function formatFieldValue(item: FieldItem): string | null {
  const { value } = item;
  if (value === null || value === undefined || value === '') return null;

  let text: string;
  switch (item.format) {
    case 'number':
      text = typeof value === 'number' ? formatNumber(value) : value;
      break;
    case 'money':
      text = typeof value === 'number' ? formatMoney(value) : value;
      break;
    case 'date':
      text = formatDate(String(value));
      break;
    case 'datetime':
      text = formatDateTime(String(value));
      break;
    case 'relative':
      text = formatRelativeTime(String(value));
      break;
    default:
      text = String(value);
  }
  return item.unit ? `${text} ${item.unit}` : text;
}

/**
 * Lista de datos con su etiqueta (`<dl>`) para las páginas de detalle. Cada dato
 * se describe con un FieldItem: el formato (fecha, dinero, número...), un enlace o
 * una insignia de estado.
 *
 *   <ui-field-list [columns]="2" [items]="[{ label: 'Distancia', value: 120, format: 'number', unit: 'km' }]" />
 */
@Component({
  selector: 'ui-field-list',
  imports: [RouterLink, IconComponent, RelationLinkComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './field-list.component.html',
  styleUrl: './field-list.component.css',
})
export class FieldListComponent {
  readonly items = input.required<readonly FieldItem[]>();
  /** En dos columnas cuando hay sitio. En móvil siempre es una. */
  readonly columns = input<1 | 2>(1);

  protected text(item: FieldItem): string | null {
    return formatFieldValue(item);
  }

  protected isDate(item: FieldItem): boolean {
    return DATE_FORMATS.has(item.format ?? 'text');
  }
}
