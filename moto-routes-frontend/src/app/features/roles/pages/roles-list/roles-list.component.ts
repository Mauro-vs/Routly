import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Role } from '../../../../core/models/role.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ListPageComponent } from '../../../../shared/components/list-page/list-page.component';
import { RowActionsComponent } from '../../../../shared/components/row-actions/row-actions.component';
import { StatusToggleComponent } from '../../../../shared/components/status-toggle/status-toggle.component';
import { EntityListPage } from '../../../../shared/pages/entity-list-page';
import { RolesStore } from '../../services/roles.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'label', header: 'Rol' },
  { key: 'description', header: 'Descripción', wide: true, plain: true },
  { key: 'type', header: 'Tipo' },
  { key: 'status', header: 'Estado', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/**
 * Listado de roles. Los roles base (admin, host, rider) no se pueden desactivar ni
 * eliminar: sus controles salen bloqueados con el motivo.
 */
@Component({
  selector: 'app-roles-list',
  imports: [
    RouterLink,
    DataTableComponent,
    TableCellDirective,
    IconComponent,
    ListPageComponent,
    RowActionsComponent,
    StatusToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-list-page
      title="Roles"
      icon="shield-check"
      createPath="/roles/new"
      trashPath="/roles/trash"
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
        caption="Roles"
        [columns]="columns"
        [rows]="pager.items()"
        [rowKey]="rowKey"
        [mutedWhen]="isInactive"
        [loading]="showSkeleton()"
      >
        <ng-template uiCell="label" [uiCellOf]="pager.items()" let-role>
          <a class="link cell-title" [routerLink]="['/roles', role.slug]" [title]="role.label">{{ role.label }}</a>
          <span class="cell-sub mono" translate="no">{{ role.name }}</span>
        </ng-template>
        <ng-template uiCell="description" [uiCellOf]="pager.items()" let-role>
          <span class="cell-text">{{ role.description || 'Sin descripción' }}</span>
        </ng-template>
        <ng-template uiCell="type" [uiCellOf]="pager.items()" let-role>
          @if (role.isSystem) {
            <span class="badge badge--icon badge--neutral"><ui-icon name="lock-simple" />Base</span>
          } @else {
            <span class="muted">Personalizado</span>
          }
        </ng-template>
        <ng-template uiCell="status" [uiCellOf]="pager.items()" let-role>
          <ui-status-toggle
            [active]="role.isActive"
            [label]="role.label"
            [labels]="store.labels"
            [busy]="store.isBusy(role._id)"
            [lockedReason]="store.toggleLockedReason(role)"
            (activeChange)="setActive(role, $event)"
          />
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="pager.items()" let-role>
          <ui-row-actions
            [label]="role.label"
            [detailPath]="['/roles', role.slug]"
            [editPath]="['/roles', role.slug, 'edit']"
            [busy]="store.isBusy(role._id)"
            [deleteLockedReason]="store.deleteLockedReason(role)"
            (remove)="remove(role)"
          />
        </ng-template>
      </ui-data-table>
    </ui-list-page>
  `,
  styles: `
    .mono {
      font-family: var(--font-mono);
    }
  `,
})
export class RolesListComponent extends EntityListPage<Role> {
  protected readonly store = inject(RolesStore);
  protected readonly columns = COLUMNS;
}
