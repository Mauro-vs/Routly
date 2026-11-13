import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Category } from '../../../../core/models/category.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { ListPageComponent } from '../../../../shared/components/list-page/list-page.component';
import { RowActionsComponent } from '../../../../shared/components/row-actions/row-actions.component';
import { StatusToggleComponent } from '../../../../shared/components/status-toggle/status-toggle.component';
import { EntityListPage } from '../../../../shared/pages/entity-list-page';
import { formatRelativeTime } from '../../../../shared/utils/format';
import { CategoriesStore } from '../../services/categories.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', header: 'Categoría' },
  { key: 'description', header: 'Descripción', wide: true, plain: true },
  { key: 'updated', header: 'Modificada' },
  { key: 'status', header: 'Estado', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/** Listado de categorías con el filtro por estado y las acciones de cada fila. */
@Component({
  selector: 'app-categories-list',
  imports: [
    RouterLink,
    DataTableComponent,
    TableCellDirective,
    ListPageComponent,
    RowActionsComponent,
    StatusToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categories-list.component.html',
})
export class CategoriesListComponent extends EntityListPage<Category> {
  protected readonly store = inject(CategoriesStore);
  protected readonly columns = COLUMNS;

  protected updated(category: Category): string {
    return formatRelativeTime(category.updatedAt);
  }
}
