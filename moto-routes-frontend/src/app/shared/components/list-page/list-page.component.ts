import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { StatusFilter } from '../../../core/services/entity.store';
import {
  CollectionLabels,
  agree,
  countLabel,
  newLabel,
  statusFilterLabels,
  statusWord,
} from '../../utils/labels';
import { RouterPath } from '../../utils/router';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ErrorStateComponent } from '../error-state/error-state.component';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icons.generated';
import { PageHeaderComponent } from '../page-header/page-header.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { SegmentOption, SegmentedComponent } from '../segmented/segmented.component';

export interface StatusCounts {
  all: number;
  active: number;
  inactive: number;
}

/**
 * Marco común de los listados: cabecera con el acceso a la papelera, filtro por
 * estado, los estados de error y de vacío, y la paginación. La tabla la pone cada
 * página dentro, con sus propias celdas:
 *
 *   <ui-list-page title="Rutas" [labels]="labels" ... [(status)]="..." [(page)]="pager.page">
 *     <ui-data-table ... />
 *   </ui-list-page>
 *
 * Con `[listToolbar]` se añaden controles junto al filtro.
 */
@Component({
  selector: 'ui-list-page',
  imports: [
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    PageHeaderComponent,
    PaginationComponent,
    SegmentedComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header [title]="title()" [subtitle]="subtitleText()">
      @if (trashPath(); as trashPath) {
        <a class="btn btn--secondary" [routerLink]="trashPath">
          <ui-icon name="trash" />Papelera
          @if (trashCount(); as count) {
            <span class="trash-count num">{{ count }}</span>
            <span class="sr-only">{{ count === 1 ? deletedOne() : deletedMany() }}</span>
          }
        </a>
      }
    </ui-page-header>

    <div class="toolbar">
      <ui-segmented
        stretch
        label="Filtrar por estado"
        [options]="statusOptions()"
        [value]="status()"
        (valueChange)="status.set($event)"
      />
      <ng-content select="[listToolbar]" />
    </div>

    @if (failed()) {
      <div class="card">
        <ui-error-state [title]="errorTitle()" (retry)="retry.emit()" />
      </div>
    } @else if (loaded() && counts().all === 0) {
      <div class="card">
        <ui-empty-state [icon]="icon()" [title]="'Todavía no hay ' + labels().plural" [description]="emptyText()">
          @if (createPath(); as createPath) {
            <a class="btn btn--primary" [routerLink]="createPath">
              <ui-icon name="plus" />{{ createLabel() }}
            </a>
          }
        </ui-empty-state>
      </div>
    } @else if (loaded() && total() === 0) {
      <div class="card">
        <ui-empty-state icon="eye-slash" [title]="filteredEmptyTitle()" description="Cambia el filtro para ver el resto.">
          <button type="button" class="btn btn--secondary" (click)="status.set('all')">
            Ver {{ statusLabels().all.toLowerCase() }}
          </button>
        </ui-empty-state>
      </div>
    } @else {
      <ng-content />
      @if (loaded()) {
        <ui-pagination class="pager" [(page)]="page" [pageSize]="pageSize()" [total]="total()" />
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .toolbar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: var(--space-4);
    }

    .trash-count {
      min-width: 20px;
      padding: 0 6px;
      border-radius: var(--radius-pill);
      background: var(--color-surface-2);
      font-size: 12px;
      line-height: 20px;
      text-align: center;
    }

    .pager {
      margin-top: var(--space-3);
    }

    @media (max-width: 560px) {
      .toolbar > ui-segmented {
        flex-basis: 100%;
      }
    }
  `,
})
export class ListPageComponent {
  readonly title = input.required<string>();
  /** Si no se da, se escribe con el total: "5 rutas". */
  readonly subtitle = input('');
  readonly labels = input.required<CollectionLabels>();
  /** Icono del estado vacío: el de la sección en el menú. */
  readonly icon = input.required<IconName>();
  /** La primera carga ha terminado. Hasta entonces no se juzga si está vacío. */
  readonly loaded = input.required<boolean>();
  /** La primera carga ha fallado: se muestra el error con "Reintentar". */
  readonly failed = input(false);
  /** Cuántos hay en total y de cada estado, para el filtro. */
  readonly counts = input.required<StatusCounts>();
  /** Cuántos quedan después del filtro, para la paginación. */
  readonly total = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly createPath = input<RouterPath | null>(null);
  readonly trashPath = input<RouterPath | null>(null);
  readonly trashCount = input<number | null>(null);

  readonly status = model.required<StatusFilter>();
  readonly page = model.required<number>();
  readonly retry = output<void>();

  protected readonly statusLabels = computed(() => statusFilterLabels(this.labels().gender));
  protected readonly statusOptions = computed<SegmentOption<StatusFilter>[]>(() => {
    const labels = this.statusLabels();
    const counts = this.counts();
    return [
      { value: 'all', label: labels.all, count: counts.all },
      { value: 'active', label: labels.active, count: counts.active },
      { value: 'inactive', label: labels.inactive, count: counts.inactive },
    ];
  });

  protected readonly subtitleText = computed(() => {
    if (this.subtitle()) return this.subtitle();
    if (!this.loaded()) return 'Cargando…';
    return `${countLabel(this.counts().all, this.labels())}.`;
  });

  protected readonly errorTitle = computed(() => {
    const { plural, gender } = this.labels();
    return `No se han podido cargar ${agree(gender, 'las', 'los')} ${plural}`;
  });
  protected readonly createLabel = computed(() => newLabel(this.labels()));
  protected readonly emptyText = computed(() => {
    const { gender } = this.labels();
    return `Crea ${agree(gender, 'la primera', 'el primero')} para que aparezca aquí.`;
  });
  protected readonly filteredEmptyTitle = computed(() => {
    const { plural, gender } = this.labels();
    const state = this.status() === 'active' ? 'active' : 'inactive';
    return `No hay ${plural} ${statusWord(state, gender)}s`;
  });

  protected deletedOne(): string {
    const { singular, gender } = this.labels();
    return `${singular} ${statusWord('deleted', gender)}`;
  }

  protected deletedMany(): string {
    const { plural, gender } = this.labels();
    return `${plural} ${statusWord('deleted', gender)}s`;
  }
}
