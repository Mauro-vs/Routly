import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { REVIEW_TARGETS, Review, ReviewTargetType } from '../../../../core/models/review.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { ListPageComponent } from '../../../../shared/components/list-page/list-page.component';
import { RatingStarsComponent } from '../../../../shared/components/rating-summary/rating-stars/rating-stars.component';
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
  templateUrl: './reviews-list.component.html',
  styleUrl: './reviews-list.component.css',
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
