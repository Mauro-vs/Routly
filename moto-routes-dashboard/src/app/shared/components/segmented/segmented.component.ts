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
  template: `
    <div class="seg" role="group" [attr.aria-label]="label()">
      @for (option of options(); track option.value) {
        <button
          type="button"
          [attr.aria-pressed]="option.value === value()"
          [attr.aria-label]="option.icon ? option.label : null"
          [attr.title]="option.icon ? option.label : null"
          (click)="value.set(option.value)"
        >
          @if (option.icon; as icon) {
            <ui-icon [name]="icon" />
          } @else {
            {{ option.label }}
          }
          @if (option.count !== undefined) {
            <b class="num">{{ option.count }}</b>
          }
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: inline-flex;
      max-width: 100%;
    }

    .seg {
      display: inline-flex;
      gap: var(--space-1);
      max-width: 100%;
    }

    button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 10px;
      border: 0;
      background: transparent;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      transition: color var(--motion-fast) ease;
    }

    button:hover {
      color: var(--color-text);
    }

    /* la opción elegida se subraya en el color de las barras */
    button[aria-pressed='true'] {
      color: var(--color-text);
      font-weight: 650;
      box-shadow: inset 0 -3px 0 var(--color-primary);
    }

    ui-icon {
      font-size: 17px;
    }

    /* el contador va en el mismo color que la etiqueta: aclararlo bajaba el contraste de AA */
    b {
      font-size: 12.5px;
      font-weight: 500;
    }

    @media (pointer: coarse) {
      button {
        height: 38px;
      }
    }

    /* En móvil ocupa todo el ancho y las opciones se lo reparten. */
    @media (max-width: 560px) {
      :host(.is-stretch),
      :host(.is-stretch) .seg {
        display: flex;
        width: 100%;
      }

      :host(.is-stretch) button {
        flex: 1;
        justify-content: center;
      }
    }
  `,
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
