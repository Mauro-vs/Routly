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
  template: `
    <p aria-live="polite">
      @if (total() > 0) {
        Mostrando <span class="num">{{ from() }} a {{ to() }}</span> de
        <span class="num">{{ total() }}</span>
      }
    </p>
    @if (pageCount() > 1) {
      <div class="pager__nav">
        <button
          type="button"
          class="icon-btn"
          aria-label="Página anterior"
          [disabled]="page() <= 1"
          (click)="page.set(page() - 1)"
        >
          <ui-icon name="caret-left" />
        </button>
        <span class="num">Página {{ page() }} de {{ pageCount() }}</span>
        <button
          type="button"
          class="icon-btn"
          aria-label="Página siguiente"
          [disabled]="page() >= pageCount()"
          (click)="page.set(page() + 1)"
        >
          <ui-icon name="caret-right" />
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      min-height: 36px;
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .pager__nav {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
  `,
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
