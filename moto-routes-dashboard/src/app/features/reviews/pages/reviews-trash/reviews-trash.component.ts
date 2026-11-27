import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { REVIEW_TARGETS, Review } from '../../../../core/models/review.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { RatingStarsComponent } from '../../../../shared/components/rating-summary/rating-stars/rating-stars.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button/restore-button.component';
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
  templateUrl: './reviews-trash.component.html',
})
export class ReviewsTrashComponent extends EntityTrashPage<Review> {
  protected readonly store = inject(ReviewsStore);
  protected readonly columns = COLUMNS;
  protected readonly targets = REVIEW_TARGETS;
}
