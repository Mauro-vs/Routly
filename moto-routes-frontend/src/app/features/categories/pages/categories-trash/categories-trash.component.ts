import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Category } from '../../../../core/models/category.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button.component';
import { TrashPageComponent } from '../../../../shared/components/trash-page/trash-page.component';
import { EntityTrashPage } from '../../../../shared/pages/entity-trash-page';
import { CategoriesStore } from '../../services/categories.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', header: 'Categoría' },
  { key: 'description', header: 'Descripción', wide: true, plain: true },
  { key: 'deleted', header: 'Eliminada' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/** Papelera de categorías: las eliminadas, que se pueden restaurar. */
@Component({
  selector: 'app-categories-trash',
  imports: [DataTableComponent, TableCellDirective, RestoreButtonComponent, TrashPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-trash-page
      backPath="/categories"
      [labels]="store.labels"
      [loaded]="store.deletedLoaded()"
      [failed]="loadFailed()"
      [total]="store.deletedCount()"
      [(restoreAs)]="restoreAs"
      (retry)="reload()"
    >
      <ui-data-table
        caption="Categorías eliminadas"
        [columns]="columns"
        [rows]="store.deleted()"
        [rowKey]="rowKey"
        [loading]="showSkeleton()"
        [skeletonRows]="3"
      >
        <ng-template uiCell="name" [uiCellOf]="store.deleted()" let-category>
          <span class="cell-title">{{ category.name }}</span>
        </ng-template>
        <ng-template uiCell="description" [uiCellOf]="store.deleted()" let-category>
          <span class="cell-text">{{ category.description || 'Sin descripción' }}</span>
        </ng-template>
        <ng-template uiCell="deleted" [uiCellOf]="store.deleted()" let-category>
          <time class="nowrap" [attr.datetime]="category.deletedAt">{{ deletedAgo(category) }}</time>
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="store.deleted()" let-category>
          <ui-restore-button
            [label]="category.name"
            [busy]="store.isBusy(category._id)"
            (restore)="restore(category)"
          />
        </ng-template>
      </ui-data-table>
    </ui-trash-page>
  `,
})
export class CategoriesTrashComponent extends EntityTrashPage<Category> {
  protected readonly store = inject(CategoriesStore);
  protected readonly columns = COLUMNS;
}
