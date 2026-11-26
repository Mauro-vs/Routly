import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { REVIEW_TARGETS, Review, ReviewTargetType } from '../../../../core/models/review.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { ListPageComponent } from '../../../../shared/components/list-page/list-page.component';
import { RatingStarsComponent } from '../../../../shared/components/rating-summary/rating-stars.component';
import { RowActionsComponent } from '../../../../shared/components/row-actions/row-actions.component';
import { StatusToggleComponent } from '../../../../shared/components/status-toggle/status-toggle.component';
import { EntityListPage } from '../../../../shared/pages/entity-list-page';
import { formatRelativeTime } from '../../../../shared/utils/format';
import { ListFilter, ListSort } from '../../../../shared/utils/search';
import { ReviewsStore } from '../../services/reviews.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'review', header: 'Opinión' },
  { key: 'target', header: 'Sobre' },
  { key: 'photos', header: 'Fotos' },
  { key: 'date', header: 'Fecha' },
  { key: 'status', header: 'Visible', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/** Cuántas miniaturas se ven en la fila; el resto, "+2" */
const THUMBS = 3;

/**
 * La moderación de las opiniones: se escriben en la web y salen al momento; aquí se revisan,
 * se ocultan (inactiva = no sale en la web ni cuenta para la nota), se borran o se les quita
 * una foto (en el detalle). Filtros: de qué tipo, sobre qué experiencia o anfitrión y cuántas
 * estrellas; el buscador mira el título y el comentario.
 */
@Component({
  selector: 'app-reviews-list',
  imports: [
    RouterLink,
    DataTableComponent,
    TableCellDirective,
    ListPageComponent,
    RatingStarsComponent,
    RowActionsComponent,
    StatusToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-list-page
      title="Opiniones"
      icon="chat-circle-text"
      trashPath="/reviews/trash"
      emptyDescription="Las escriben los riders en la web, en las experiencias y en las fichas de los guías."
      [labels]="store.labels"
      [loaded]="listLoaded()"
      [refreshing]="refreshing()"
      [filters]="listFilters"
      [filterValues]="filterValues()"
      (filterChange)="setFilter($event)"
      (clearFilters)="clearFilters()"
      [failed]="loadFailed()"
      [counts]="counts()"
      [total]="store.pageTotal()"
      [pageSize]="pageSize"
      [trashCount]="store.deletedCount()"
      [status]="store.status()"
      [(query)]="query"
      [sorts]="sorts"
      [(sort)]="sort"
      (statusChange)="setStatus($event)"
      [(page)]="page"
      (retry)="reload()"
    >
      <ui-data-table
        caption="Opiniones"
        [columns]="columns"
        [rows]="rows()"
        [rowKey]="rowKey"
        [mutedWhen]="isInactive"
        [loading]="showSkeleton()"
      >
        <ng-template uiCell="review" [uiCellOf]="rows()" let-review>
          <span class="review">
            <ui-rating-stars [value]="review.rating" />
            <a class="link cell-title" [routerLink]="['/reviews', review._id]" [title]="name(review)">{{ name(review) }}</a>
            @if (review.comment) {
              <span class="cell-sub snippet">{{ review.comment }}</span>
            }
            <!-- Sin título, el nombre ya dice de quién es -->
            @if (review.title) {
              <span class="cell-sub">{{ review.user?.name ?? 'Usuario eliminado' }}</span>
            }
          </span>
        </ng-template>
        <ng-template uiCell="target" [uiCellOf]="rows()" let-review>
          @if (review.target; as target) {
            <a class="link" [routerLink]="[targets[review.targetType].path, target.slug]">{{ target.name }}</a>
          } @else {
            <span class="muted">Eliminado</span>
          }
          <span class="cell-sub">{{ targets[review.targetType].label }}</span>
        </ng-template>
        <ng-template uiCell="photos" [uiCellOf]="rows()" let-review>
          @if (review.photos.length > 0) {
            <a class="thumbs" [routerLink]="['/reviews', review._id]" [attr.aria-label]="review.photos.length + ' fotos de ' + name(review)">
              @for (photo of review.photos.slice(0, thumbs); track photo._id) {
                <span class="thumb" aria-hidden="true">
                  <img [src]="photo.url" alt="" loading="lazy" decoding="async" width="40" height="40" />
                </span>
              }
              @if (review.photos.length > thumbs) {
                <span class="more" aria-hidden="true">+{{ review.photos.length - thumbs }}</span>
              }
            </a>
          } @else {
            <span class="muted">—</span>
          }
        </ng-template>
        <ng-template uiCell="date" [uiCellOf]="rows()" let-review>
          <time class="nowrap" [attr.datetime]="review.createdAt">{{ ago(review.createdAt) }}</time>
        </ng-template>
        <ng-template uiCell="status" [uiCellOf]="rows()" let-review>
          <ui-status-toggle
            [active]="review.isActive"
            [label]="name(review)"
            [labels]="store.labels"
            [busy]="store.isBusy(review._id)"
            (activeChange)="setActive(review, $event)"
          />
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="rows()" let-review>
          <ui-row-actions
            [label]="name(review)"
            [detailPath]="['/reviews', review._id]"
            [busy]="store.isBusy(review._id)"
            (remove)="remove(review)"
          />
        </ng-template>
      </ui-data-table>
    </ui-list-page>
  `,
  styles: `
    .review {
      display: grid;
      gap: 2px;
      max-width: 42ch;
    }

    .snippet {
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      white-space: normal;
    }

    .thumbs {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .more {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
  `,
})
export class ReviewsListComponent extends EntityListPage<Review> {
  protected readonly store = inject(ReviewsStore);
  protected override readonly sorts: readonly ListSort[] = [
    { value: 'recientes', label: 'Más recientes', sort: '-createdAt' },
    { value: 'peores', label: 'Peor nota primero', sort: 'rating,-createdAt' },
    { value: 'mejores', label: 'Mejor nota primero', sort: '-rating,-createdAt' },
  ];
  protected override readonly listFilters: readonly ListFilter[] = [
    {
      param: 'tipo',
      label: 'Filtrar por tipo',
      allLabel: 'Experiencias y anfitriones',
      options: () => (Object.keys(REVIEW_TARGETS) as ReviewTargetType[]).map((value) => ({ value, label: REVIEW_TARGETS[value].label })),
      toApi: (targetType) => ({ targetType }),
    },
    {
      param: 'sobre',
      label: 'Filtrar por experiencia o anfitrión',
      allLabel: 'Sobre cualquiera',
      options: () =>
        this.store.targetOptions
          .items()
          .map((target) => ({ value: target._id, label: `${REVIEW_TARGETS[target.type].label} · ${target.name}` })),
      toApi: (targetId) => ({ targetId }),
    },
    {
      param: 'estrellas',
      label: 'Filtrar por estrellas',
      allLabel: 'Todas las notas',
      options: () => [5, 4, 3, 2, 1].map((stars) => ({ value: String(stars), label: `${stars} ${stars === 1 ? 'estrella' : 'estrellas'}` })),
      toApi: (rating) => ({ rating }),
    },
  ];
  protected readonly columns = COLUMNS;
  protected readonly targets = REVIEW_TARGETS;
  protected readonly thumbs = THUMBS;
  protected readonly ago = formatRelativeTime;

  override ngOnInit(): void {
    super.ngOnInit();
    void this.store.targetOptions.load();
  }
}
