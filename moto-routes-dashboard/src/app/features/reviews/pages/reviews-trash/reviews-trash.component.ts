import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { REVIEW_TARGETS, Review } from '../../../../core/models/review.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { RatingStarsComponent } from '../../../../shared/components/rating-summary/rating-stars.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button.component';
import { TrashPageComponent } from '../../../../shared/components/trash-page/trash-page.component';
import { EntityTrashPage } from '../../../../shared/pages/entity-trash-page';
import { ReviewsStore } from '../../services/reviews.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'review', header: 'Opinión' },
  { key: 'target', header: 'Sobre' },
  { key: 'was', header: 'Estaba' },
  { key: 'deleted', header: 'Eliminada' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/**
 * Papelera de opiniones: las que ha borrado su autor o el admin. La API no restaura una si lo
 * que valora está eliminado o si su autor ya ha vuelto a opinar (409): el motivo llega en el aviso.
 */
@Component({
  selector: 'app-reviews-trash',
  imports: [DataTableComponent, TableCellDirective, RatingStarsComponent, RestoreButtonComponent, StatusBadgeComponent, TrashPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-trash-page
      backPath="/reviews"
      [labels]="store.labels"
      [loaded]="store.deletedLoaded()"
      [failed]="loadFailed()"
      [total]="store.deletedCount()"
      [(restoreAs)]="restoreAs"
      (retry)="reload()"
    >
      <ui-data-table
        caption="Opiniones eliminadas"
        [columns]="columns"
        [rows]="store.deleted()"
        [rowKey]="rowKey"
        [loading]="showSkeleton()"
        [skeletonRows]="3"
      >
        <ng-template uiCell="review" [uiCellOf]="store.deleted()" let-review>
          <ui-rating-stars [value]="review.rating" />
          <span class="cell-title" [title]="name(review)">{{ name(review) }}</span>
          <span class="cell-sub">{{ review.user?.name ?? 'Usuario eliminado' }}</span>
        </ng-template>
        <ng-template uiCell="target" [uiCellOf]="store.deleted()" let-review>
          {{ review.target?.name ?? 'Eliminado' }}
          <span class="cell-sub">{{ targets[review.targetType].label }}</span>
        </ng-template>
        <ng-template uiCell="was" [uiCellOf]="store.deleted()" let-review>
          <ui-status-badge [status]="review.status" [gender]="store.labels.gender" />
        </ng-template>
        <ng-template uiCell="deleted" [uiCellOf]="store.deleted()" let-review>
          <time class="nowrap" [attr.datetime]="review.deletedAt">{{ deletedAgo(review) }}</time>
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="store.deleted()" let-review>
          <ui-restore-button [label]="name(review)" [busy]="store.isBusy(review._id)" (restore)="restore(review)" />
        </ng-template>
      </ui-data-table>
    </ui-trash-page>
  `,
})
export class ReviewsTrashComponent extends EntityTrashPage<Review> {
  protected readonly store = inject(ReviewsStore);
  protected readonly columns = COLUMNS;
  protected readonly targets = REVIEW_TARGETS;
}
