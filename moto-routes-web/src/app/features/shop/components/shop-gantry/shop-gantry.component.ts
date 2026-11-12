import { ChangeDetectionStrategy, Component, ElementRef, input, output, viewChildren } from '@angular/core';

import { FilterGroupComponent, FilterOption } from '../../../../shared/ui/filter-group/filter-group.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SearchBoxComponent } from '../../../../shared/ui/search-box/search-box.component';
import { FilterKey } from '../../shop.store';

/** Una placa del pórtico: un filtro con sus opciones */
export interface GantryPlate {
  key: FilterKey;
  label: string;
  allLabel: string;
  options: FilterOption[];
  value: string | null;
}

/**
 * El pórtico del Shop: los filtros como placas verdes en fila, cada una con su etiqueta pequeña y
 * el valor elegido en grande. Al pulsarla se despliega su grupo de opciones (un `details`, que ya
 * es un botón con su estado para el lector de pantalla); al elegir, se cierra. La última placa es
 * la búsqueda. En el móvil no se enseña: los filtros van en la hoja (filter-sheet).
 */
@Component({
  selector: 'app-shop-gantry',
  imports: [FilterGroupComponent, SearchBoxComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gantry" role="group" aria-label="Filtros">
      @for (plate of plates(); track plate.key) {
        <details #plateEl class="plate" (keydown.escape)="close(plateEl)">
          <summary>
            <span class="label">{{ plate.label }}</span>
            <span class="value">{{ selected(plate) }}</span>
            <ui-icon name="caret-down" class="caret" />
          </summary>
          <div class="panel">
            <ui-filter-group
              [legend]="plate.label"
              [allLabel]="plate.allLabel"
              [options]="plate.options"
              [value]="plate.value"
              (valueChange)="choose(plateEl, plate.key, $event)"
            />
          </div>
        </details>
      }
      <div class="plate plate--search">
        <ui-search-box label="Buscar experiencias" placeholder="costa, pirineo, viñedos…" [value]="search()" (search)="searchChange.emit($event)" />
      </div>
    </div>
  `,
  styles: `
    .gantry {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(0, 1.25fr);
      gap: var(--space-2);
    }

    .plate {
      position: relative;
      padding: 4px;
      border-radius: var(--radius-md);
      background: var(--sign);
      color: var(--on-sign);
    }

    summary {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: end;
      gap: 0 var(--space-2);
      min-height: 64px;
      height: 100%;
      padding: var(--space-2) var(--space-3);
      border: 2px solid var(--on-sign);
      border-radius: 3px;
      list-style: none;
      cursor: pointer;
    }

    summary::-webkit-details-marker {
      display: none;
    }

    summary:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    .label {
      grid-column: 1 / -1;
      font-size: 11px;
      font-weight: 750;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      opacity: 0.85;
    }

    .value {
      overflow: hidden;
      font-size: 17px;
      font-weight: 750;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .caret {
      font-size: 16px;
      transition: transform var(--motion-fast) var(--motion-ease);
    }

    details[open] .caret {
      transform: rotate(180deg);
    }

    details[open] summary {
      background: rgb(255 255 255 / 0.08);
    }

    /* El desplegable: una hoja clara bajo la placa */
    .panel {
      position: absolute;
      top: calc(100% + var(--space-2));
      left: 0;
      z-index: 20;
      width: max(100%, 280px);
      max-height: min(60vh, 420px);
      overflow: auto;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      color: var(--color-text);
      box-shadow: var(--shadow-3);
    }

    .plate--search {
      display: grid;
      align-items: center;
      padding: 8px;
    }

    .plate--search ui-search-box {
      --color-surface: #ffffff;
      --color-text: #0f1a15;
      --color-text-muted: #4c5d53;
      --color-border-strong: #ffffff;
    }
  `,
  host: { '(document:click)': 'closeOutside($event.target)' },
})
export class ShopGantryComponent {
  readonly plates = input.required<GantryPlate[]>();
  readonly search = input('');
  readonly filterChange = output<{ key: FilterKey; value: string | null }>();
  readonly searchChange = output<string>();

  private readonly plateEls = viewChildren<ElementRef<HTMLDetailsElement>>('plateEl');

  protected selected(plate: GantryPlate): string {
    return plate.options.find((option) => option.value === plate.value)?.label ?? plate.allLabel;
  }

  protected choose(details: HTMLDetailsElement, key: FilterKey, value: string | null): void {
    this.close(details);
    this.filterChange.emit({ key, value });
  }

  protected close(details: HTMLDetailsElement): void {
    details.open = false;
    details.querySelector('summary')?.focus();
  }

  // Al pulsar fuera de una placa abierta, se cierra
  protected closeOutside(target: EventTarget | null): void {
    for (const { nativeElement } of this.plateEls()) {
      if (nativeElement.open && !(target instanceof Node && nativeElement.contains(target))) nativeElement.open = false;
    }
  }
}
