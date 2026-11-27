import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Category } from '../../../../core/models/category.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button/restore-button.component';
import { TrashPageComponent } from '../../../../shared/components/trash-page/trash-page.component';
import { EntityTrashPage } from '../../../../shared/pages/entity-trash-page';
import { CategoriesStore } from '../../services/categories.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', header: 'Categoría' },
  { key: 'description', header: 'Descripción', wide: true, plain: true },
  { key: 'was', header: 'Estaba' },
  { key: 'deleted', header: 'Eliminada' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/** Papelera de categorías: las eliminadas, que se pueden restaurar. */
@Component({
  selector: 'app-categories-trash',
  imports: [
    DataTableComponent,
    TableCellDirective,
    RestoreButtonComponent,
    StatusBadgeComponent,
    TrashPageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categories-trash.component.html',
})
export class CategoriesTrashComponent extends EntityTrashPage<Category> {
  protected readonly store = inject(CategoriesStore);
  protected readonly columns = COLUMNS;
}
