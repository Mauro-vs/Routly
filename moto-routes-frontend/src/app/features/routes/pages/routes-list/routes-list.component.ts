import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DIFFICULTY_BADGES, DIFFICULTY_LABELS, Route } from '../../../../core/models/route.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ListPageComponent } from '../../../../shared/components/list-page/list-page.component';
import { RelationLinkComponent } from '../../../../shared/components/relation-link/relation-link.component';
import { RowActionsComponent } from '../../../../shared/components/row-actions/row-actions.component';
import { StatusToggleComponent } from '../../../../shared/components/status-toggle/status-toggle.component';
import { EntityListPage } from '../../../../shared/pages/entity-list-page';
import { formatNumber } from '../../../../shared/utils/format';
import { RoutesStore } from '../../services/routes.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'title', header: 'Ruta' },
  { key: 'trip', header: 'Recorrido', wide: true },
  { key: 'category', header: 'Categoría' },
  { key: 'difficulty', header: 'Dificultad', plain: true },
  { key: 'status', header: 'Estado', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/** Listado de rutas con el filtro por estado y las acciones de cada fila. */
@Component({
  selector: 'app-routes-list',
  imports: [
    RouterLink,
    DataTableComponent,
    TableCellDirective,
    IconComponent,
    ListPageComponent,
    RelationLinkComponent,
    RowActionsComponent,
    StatusToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routes-list.component.html',
  styles: `
    .trip {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0 6px;
    }
  `,
})
export class RoutesListComponent extends EntityListPage<Route> {
  protected readonly store = inject(RoutesStore);
  protected readonly columns = COLUMNS;
  protected readonly difficultyLabels = DIFFICULTY_LABELS;
  protected readonly difficultyBadges = DIFFICULTY_BADGES;
  protected readonly number = formatNumber;
}
