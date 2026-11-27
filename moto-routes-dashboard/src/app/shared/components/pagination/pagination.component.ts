import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

/**
 * Pie de un listado paginado en el cliente: cuántos registros se ven y los botones
 * para avanzar. Solo calcula; el corte de la lista lo hace quien lo usa con `page`
 * y `pageSize`.
 */
@Component({
  selector: 'ui-pagination',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css',
})
export class PaginationComponent {
  /** Página actual, empezando en 1. */
  readonly page = model.required<number>();
  readonly pageSize = input.required<number>();
  /** Total de registros después de aplicar búsqueda y filtros. */
  readonly total = input.required<number>();

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );
  protected readonly from = computed(() => (this.page() - 1) * this.pageSize() + 1);
  protected readonly to = computed(() => Math.min(this.page() * this.pageSize(), this.total()));
}
