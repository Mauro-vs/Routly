import { ChangeDetectionStrategy, Component, ElementRef, input, output, viewChild } from '@angular/core';

import { FilterGroupComponent } from '../../../../shared/ui/filter-group/filter-group.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { PriceRange, PriceRangeComponent } from '../../../../shared/ui/price-range/price-range.component';
import { PRICE_RANGE } from '../../shop-query';
import { FilterKey } from '../../shop.store';
import { GantryPlate } from '../shop-gantry/shop-gantry.component';

/**
 * Los filtros en el móvil: una hoja que sube desde abajo (un `dialog` modal: atrapa el foco,
 * se cierra con Escape y devuelve el foco al botón que la abrió). Cada cambio se aplica al momento,
 * y el botón de abajo dice cuántas experiencias hay con lo elegido.
 */
@Component({
  selector: 'app-filter-sheet',
  imports: [FilterGroupComponent, PriceRangeComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-sheet.component.html',
  styleUrl: './filter-sheet.component.css',
})
export class FilterSheetComponent {
  readonly plates = input.required<GantryPlate[]>();
  readonly withDates = input(false);
  readonly price = input<PriceRange>({ min: null, max: null });
  readonly resultsLabel = input('Ver experiencias');
  readonly filterChange = output<{ key: FilterKey; value: string | null }>();
  readonly withDatesChange = output<boolean>();
  readonly priceChange = output<PriceRange>();
  protected readonly priceRange = PRICE_RANGE;

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
