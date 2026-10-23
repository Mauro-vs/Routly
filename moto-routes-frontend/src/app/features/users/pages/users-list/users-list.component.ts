import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { User } from '../../../../core/models/user.model';
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
import { UsersStore } from '../../services/users.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', header: 'Usuario' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Rol' },
  { key: 'status', header: 'Estado', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/** Listado de usuarios: las cuentas de la plataforma, con su rol. */
@Component({
  selector: 'app-users-list',
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
  template: `
    <ui-list-page
      title="Usuarios"
      icon="users"
      createPath="/users/new"
      trashPath="/users/trash"
      [labels]="store.labels"
      [loaded]="store.loaded()"
      [failed]="loadFailed()"
      [counts]="counts()"
      [total]="pager.total()"
      [pageSize]="pager.pageSize"
      [trashCount]="store.deletedCount()"
      [status]="store.status()"
      (statusChange)="setStatus($event)"
      [(page)]="pager.page"
      (retry)="reload()"
    >
      <ui-data-table
        caption="Usuarios"
        [columns]="columns"
        [rows]="pager.items()"
        [rowKey]="rowKey"
        [mutedWhen]="isInactive"
        [loading]="showSkeleton()"
      >
        <ng-template uiCell="name" [uiCellOf]="pager.items()" let-user>
          <span class="cell-media">
            <span class="thumb thumb--round" aria-hidden="true">
              @if (user.coverImage; as photo) {
                <img [src]="photo.url" alt="" loading="lazy" decoding="async" width="40" height="40" />
              } @else {
                <ui-icon name="user-circle" />
              }
            </span>
            <a class="link cell-title" [routerLink]="['/users', user.slug]">{{ user.name }}</a>
          </span>
        </ng-template>
        <ng-template uiCell="email" [uiCellOf]="pager.items()" let-user>
          <span class="cell-sub email" translate="no">{{ user.email }}</span>
        </ng-template>
        <ng-template uiCell="role" [uiCellOf]="pager.items()" let-user>
          <ui-relation-link
            [label]="user.role?.label ?? null"
            [path]="user.role ? ['/roles', 'id', user.role._id] : null"
          />
        </ng-template>
        <ng-template uiCell="status" [uiCellOf]="pager.items()" let-user>
          <ui-status-toggle
            [active]="user.isActive"
            [label]="user.name"
            [labels]="store.labels"
            [busy]="store.isBusy(user._id)"
            (activeChange)="setActive(user, $event)"
          />
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="pager.items()" let-user>
          <ui-row-actions
            [label]="user.name"
            [detailPath]="['/users', user.slug]"
            [editPath]="['/users', user.slug, 'edit']"
            [busy]="store.isBusy(user._id)"
            (remove)="remove(user)"
          />
        </ng-template>
      </ui-data-table>
    </ui-list-page>
  `,
  styles: `
    .email {
      font-size: var(--text-sm);
      color: var(--color-text);
    }
  `,
})
export class UsersListComponent extends EntityListPage<User> {
  protected readonly store = inject(UsersStore);
  protected readonly columns = COLUMNS;
}
