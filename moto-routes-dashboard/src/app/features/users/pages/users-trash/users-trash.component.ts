import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { User } from '../../../../core/models/user.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { RelationLinkComponent } from '../../../../shared/components/relation-link/relation-link.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button.component';
import { TrashPageComponent } from '../../../../shared/components/trash-page/trash-page.component';
import { EntityTrashPage } from '../../../../shared/pages/entity-trash-page';
import { UsersStore } from '../../services/users.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', header: 'Usuario' },
  { key: 'role', header: 'Rol' },
  { key: 'was', header: 'Estaba' },
  { key: 'deleted', header: 'Eliminado' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/** Papelera de usuarios. No se restaura uno cuyo rol sigue eliminado. */
@Component({
  selector: 'app-users-trash',
  imports: [
    DataTableComponent,
    TableCellDirective,
    RelationLinkComponent,
    RestoreButtonComponent,
    StatusBadgeComponent,
    TrashPageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-trash-page
      backPath="/users"
      [labels]="store.labels"
      [loaded]="store.deletedLoaded()"
      [failed]="loadFailed()"
      [total]="store.deletedCount()"
      [(restoreAs)]="restoreAs"
      (retry)="reload()"
    >
      <ui-data-table
        caption="Usuarios eliminados"
        [columns]="columns"
        [rows]="store.deleted()"
        [rowKey]="rowKey"
        [loading]="showSkeleton()"
        [skeletonRows]="3"
      >
        <ng-template uiCell="name" [uiCellOf]="store.deleted()" let-user>
          <span class="cell-title" [title]="user.name">{{ user.name }}</span>
          <span class="cell-sub" translate="no">{{ user.email }}</span>
        </ng-template>
        <ng-template uiCell="role" [uiCellOf]="store.deleted()" let-user>
          <ui-relation-link [label]="user.role?.label ?? null" />
        </ng-template>
        <ng-template uiCell="was" [uiCellOf]="store.deleted()" let-user>
          <ui-status-badge [status]="user.status" [gender]="store.labels.gender" />
        </ng-template>
        <ng-template uiCell="deleted" [uiCellOf]="store.deleted()" let-user>
          <time class="nowrap" [attr.datetime]="user.deletedAt">{{ deletedAgo(user) }}</time>
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="store.deleted()" let-user>
          <ui-restore-button
            [label]="user.name"
            [busy]="store.isBusy(user._id)"
            [blockedReason]="blockedReason(user)"
            (restore)="restore(user)"
          />
        </ng-template>
      </ui-data-table>
    </ui-trash-page>
  `,
})
export class UsersTrashComponent extends EntityTrashPage<User> {
  protected readonly store = inject(UsersStore);
  protected readonly columns = COLUMNS;

  protected override blockedReason(user: User): string | null {
    return this.store.restoreBlockedReason(user);
  }
}
