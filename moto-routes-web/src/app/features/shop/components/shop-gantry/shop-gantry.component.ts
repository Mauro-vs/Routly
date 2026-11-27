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
  templateUrl: './shop-gantry.component.html',
  styleUrl: './shop-gantry.component.css',
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
