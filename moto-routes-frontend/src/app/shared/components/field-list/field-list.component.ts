import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { formatDate, formatDateTime, formatMoney, formatNumber, formatRelativeTime } from '../../utils/format';
import { Gender } from '../../utils/labels';
import { RouterPath } from '../../utils/router';
import { IconComponent } from '../icon/icon.component';
import { RelationLinkComponent } from '../relation-link/relation-link.component';
import { BadgeStatus, StatusBadgeComponent } from '../status-badge/status-badge.component';

export type FieldFormat =
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
  template: `
    <dl [class.is-split]="columns() === 2">
      @for (item of items(); track item.label) {
        <div class="field" [class.field--wide]="item.wide">
          <dt>{{ item.label }}</dt>
          <dd>
            @if (item.status; as status) {
              <ui-status-badge [status]="status" [gender]="item.gender ?? 'm'" />
            } @else if (item.relation) {
              <ui-relation-link
                [label]="text(item)"
                [path]="item.link ?? null"
                [gender]="item.gender ?? 'm'"
              />
            } @else if (text(item); as value) {
              @if (isDate(item)) {
                <time [attr.datetime]="item.value">{{ value }}</time>
              } @else if (item.link; as link) {
                <a class="link" [routerLink]="link">{{ value }}</a>
              } @else if (item.href; as href) {
                <a class="link external" [href]="href" target="_blank" rel="noopener">
                  <span>{{ value }}</span>
                  <span class="sr-only">(se abre en una pestaña nueva)</span>
                  <ui-icon name="arrow-up-right" />
                </a>
              } @else {
                <span
                  [class.mono]="item.format === 'mono'"
                  [class.multiline]="item.format === 'multiline'"
                  [class.num]="item.format === 'number' || item.format === 'money'"
                  [attr.translate]="item.format === 'mono' ? 'no' : null"
                  >{{ value }}</span
                >
              }
            } @else {
              <span class="empty">{{ item.empty ?? 'Sin datos' }}</span>
            }
          </dd>
        </div>
      }
    </dl>
  `,
  styles: `
    :host {
      display: block;
    }

    dl {
      display: grid;
      gap: var(--space-4);
    }

    dl.is-split {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-4) var(--space-5);
    }

    .field--wide {
      grid-column: 1 / -1;
    }

    dt {
      margin-bottom: 2px;
      font-size: var(--text-xs);
      font-weight: 500;
      color: var(--color-text-muted);
    }

    dd {
      overflow-wrap: anywhere;
    }

    .mono {
      font: 400 var(--text-sm) / 1.5 var(--font-mono);
    }

    .multiline {
      white-space: pre-line;
    }

    .empty {
      color: var(--color-text-muted);
    }

    .external {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      max-width: 100%;
    }

    .external span:first-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .external ui-icon {
      font-size: 13px;
    }

    @media (max-width: 560px) {
      dl.is-split {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
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
