import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface FilterOption {
  value: string;
  label: string;
  /** Cuántos resultados tiene, si se sabe */
  count?: number;
}

let nextId = 0;

/**
 * Un filtro de una sola opción: un grupo de radios con su leyenda, la opción de "todas" primero
 * y, si se sabe, cuántos resultados tiene cada una. Con el teclado, las flechas cambian de
 * opción (es un radio de verdad). No sabe qué filtra: emite el valor elegido, o null.
 */
@Component({
  selector: 'ui-filter-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset>
      <legend>{{ legend() }}</legend>
      <label class="option">
        <input type="radio" [name]="name" [checked]="value() === null" (change)="value.set(null)" />
        <span>{{ allLabel() }}</span>
      </label>
      @for (option of options(); track option.value) {
        <label class="option">
          <input type="radio" [name]="name" [checked]="value() === option.value" (change)="value.set(option.value)" />
          <span>{{ option.label }}</span>
          @if (option.count !== undefined) {
            <span class="count num"><span class="sr-only">, </span>{{ option.count }}</span>
          }
        </label>
      }
    </fieldset>
  `,
  styles: `
    fieldset {
      display: grid;
      gap: 2px;
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }

    legend {
      margin-bottom: var(--space-2);
      padding: 0;
      font-size: var(--text-xs);
      font-weight: 750;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }

    .option {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-height: 44px;
      padding: 0 var(--space-2);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .option:hover {
      background: color-mix(in srgb, var(--color-text) 6%, transparent);
    }

    input {
      width: 18px;
      height: 18px;
      margin: 0;
      accent-color: var(--color-primary);
    }

    .option:has(input:checked) {
      font-weight: 700;
    }

    .count {
      margin-left: auto;
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }
  `,
})
export class FilterGroupComponent {
  readonly legend = input.required<string>();
  readonly options = input.required<FilterOption[]>();
  /** La opción que quita el filtro */
  readonly allLabel = input('Todas');
  /** El valor elegido, o null si no se filtra */
  readonly value = model<string | null>(null);

  protected readonly name = `filter-${nextId++}`;
}
