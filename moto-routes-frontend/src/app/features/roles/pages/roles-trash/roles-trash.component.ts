import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Role } from '../../../../core/models/role.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button.component';
import { TrashPageComponent } from '../../../../shared/components/trash-page/trash-page.component';
import { EntityTrashPage } from '../../../../shared/pages/entity-trash-page';
import { RolesStore } from '../../services/roles.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'label', header: 'Rol' },
  { key: 'description', header: 'Descripción', wide: true, plain: true },
  { key: 'was', header: 'Estaba' },
  { key: 'deleted', header: 'Eliminado' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/** Papelera de roles: los eliminados, que se pueden restaurar. */
@Component({
  selector: 'app-roles-trash',
  imports: [
    DataTableComponent,
    TableCellDirective,
    RestoreButtonComponent,
    StatusBadgeComponent,
    TrashPageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-trash-page
      backPath="/roles"
      [labels]="store.labels"
      [loaded]="store.deletedLoaded()"
      [failed]="loadFailed()"
      [total]="store.deletedCount()"
      [(restoreAs)]="restoreAs"
      (retry)="reload()"
    >
      <ui-data-table
        caption="Roles eliminados"
        [columns]="columns"
        [rows]="store.deleted()"
        [rowKey]="rowKey"
        [loading]="showSkeleton()"
        [skeletonRows]="3"
      >
        <ng-template uiCell="label" [uiCellOf]="store.deleted()" let-role>
          <span class="cell-title" [title]="role.label">{{ role.label }}</span>
          <span class="cell-sub" translate="no">{{ role.name }}</span>
        </ng-template>
        <ng-template uiCell="description" [uiCellOf]="store.deleted()" let-role>
          <span class="cell-text">{{ role.description || 'Sin descripción' }}</span>
        </ng-template>
        <ng-template uiCell="was" [uiCellOf]="store.deleted()" let-role>
          <ui-status-badge [status]="role.status" [gender]="store.labels.gender" />
        </ng-template>
        <ng-template uiCell="deleted" [uiCellOf]="store.deleted()" let-role>
          <time class="nowrap" [attr.datetime]="role.deletedAt">{{ deletedAgo(role) }}</time>
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="store.deleted()" let-role>
          <ui-restore-button
            [label]="role.label"
            [busy]="store.isBusy(role._id)"
            (restore)="restore(role)"
          />
        </ng-template>
      </ui-data-table>
    </ui-trash-page>
  `,
})
export class RolesTrashComponent extends EntityTrashPage<Role> {
  protected readonly store = inject(RolesStore);
  protected readonly columns = COLUMNS;
}
