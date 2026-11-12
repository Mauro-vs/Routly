import { ChangeDetectionStrategy, Component, ElementRef, input, output, viewChild } from '@angular/core';

import { FilterGroupComponent } from '../../../../shared/ui/filter-group/filter-group.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { FilterKey } from '../../shop.store';
import { GantryPlate } from '../shop-gantry/shop-gantry.component';

/**
 * Los filtros en el móvil: una hoja que sube desde abajo (un `dialog` modal: atrapa el foco,
 * se cierra con Escape y devuelve el foco al botón que la abrió). Cada cambio se aplica al momento,
 * y el botón de abajo dice cuántas experiencias hay con lo elegido.
 */
@Component({
  selector: 'app-filter-sheet',
  imports: [FilterGroupComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog aria-labelledby="filter-sheet-title" (click)="closeOnBackdrop($event)">
      <div class="sheet">
        <header>
          <h2 id="filter-sheet-title">Filtros</h2>
          <button type="button" class="close" aria-label="Cerrar los filtros" (click)="close()"><ui-icon name="x" /></button>
        </header>
        <div class="groups">
          @for (plate of plates(); track plate.key) {
            <ui-filter-group
              [legend]="plate.label"
              [allLabel]="plate.allLabel"
              [options]="plate.options"
              [value]="plate.value"
              (valueChange)="filterChange.emit({ key: plate.key, value: $event })"
            />
          }
          <label class="switch">
            <input type="checkbox" [checked]="withDates()" (change)="withDatesChange.emit($any($event.target).checked)" />
            Solo las que tienen fechas
          </label>
        </div>
        <footer>
          <button type="button" class="btn-primary" (click)="close()">{{ resultsLabel() }}</button>
        </footer>
      </div>
    </dialog>
  `,
  styles: `
    dialog {
      width: 100%;
      max-width: 100%;
      max-height: 88dvh;
      margin: auto 0 0;
      padding: 0;
      border: 0;
      border-radius: 14px 14px 0 0;
      background: var(--color-surface);
      color: var(--color-text);
      box-shadow: var(--shadow-3);
    }

    dialog[open] {
      animation: rise var(--motion-slow) var(--motion-ease);
    }

    dialog::backdrop {
      background: rgb(7 18 12 / 0.55);
    }

    @keyframes rise {
      from {
        transform: translateY(24px);
        opacity: 0;
      }
    }

    .sheet {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      max-height: 88dvh;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-4) var(--space-2);
      border-bottom: 1px solid var(--color-border);
    }

    h2 {
      font-size: 20px;
      font-weight: 800;
    }

    .close {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border: 0;
      border-radius: var(--radius-md);
      background: none;
      font-size: 20px;
      cursor: pointer;
    }

    .groups {
      display: grid;
      gap: var(--space-5);
      overflow: auto;
      padding: var(--space-4);
    }

    .switch {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-height: 44px;
      font-weight: 650;
    }

    .switch input {
      width: 20px;
      height: 20px;
      accent-color: var(--color-primary);
    }

    footer {
      padding: var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom));
      border-top: 1px solid var(--color-border);
    }

    footer .btn-primary {
      width: 100%;
    }
  `,
})
export class FilterSheetComponent {
  readonly plates = input.required<GantryPlate[]>();
  readonly withDates = input(false);
  readonly resultsLabel = input('Ver experiencias');
  readonly filterChange = output<{ key: FilterKey; value: string | null }>();
  readonly withDatesChange = output<boolean>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  // Pulsar fuera de la hoja (en el fondo oscuro) la cierra
  protected closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }
}
