import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Host } from '../../../../core/models/host.model';
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
import { HostsStore } from '../../services/hosts.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', header: 'Anfitrión' },
  { key: 'user', header: 'Usuario' },
  { key: 'biography', header: 'Biografía', wide: true, plain: true },
  { key: 'status', header: 'Estado', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/** Listado de anfitriones: los perfiles públicos de los guías, con su usuario. */
@Component({
  selector: 'app-hosts-list',
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
      title="Anfitriones"
      icon="user-circle"
      createPath="/hosts/new"
      trashPath="/hosts/trash"
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
        caption="Anfitriones"
        [columns]="columns"
        [rows]="pager.items()"
        [rowKey]="rowKey"
        [mutedWhen]="isInactive"
        [loading]="showSkeleton()"
      >
        <ng-template uiCell="name" [uiCellOf]="pager.items()" let-host>
          <span class="cell-media">
            <span class="thumb thumb--round" aria-hidden="true">
              @if (host.coverImage; as photo) {
                <img [src]="photo.url" alt="" loading="lazy" decoding="async" width="40" height="40" />
              } @else {
                <ui-icon name="user-circle" />
              }
            </span>
            <a class="link cell-title" [routerLink]="['/hosts', host.slug]" [title]="host.name">{{ host.name }}</a>
          </span>
        </ng-template>
        <ng-template uiCell="user" [uiCellOf]="pager.items()" let-host>
          <ui-relation-link
            [label]="host.user?.name ?? null"
            [path]="host.user ? ['/users', 'id', host.user._id] : null"
          />
          @if (host.user; as user) {
            <span class="cell-sub" translate="no" [title]="user.email">{{ user.email }}</span>
          }
        </ng-template>
        <ng-template uiCell="biography" [uiCellOf]="pager.items()" let-host>
          <span class="cell-text">{{ host.biography || 'Sin biografía' }}</span>
        </ng-template>
        <ng-template uiCell="status" [uiCellOf]="pager.items()" let-host>
          <ui-status-toggle
            [active]="host.isActive"
            [label]="host.name"
            [labels]="store.labels"
            [busy]="store.isBusy(host._id)"
            (activeChange)="setActive(host, $event)"
          />
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="pager.items()" let-host>
          <ui-row-actions
            [label]="host.name"
            [detailPath]="['/hosts', host.slug]"
            [editPath]="['/hosts', host.slug, 'edit']"
            [busy]="store.isBusy(host._id)"
            (remove)="remove(host)"
          />
        </ng-template>
      </ui-data-table>
    </ui-list-page>
  `,
})
export class HostsListComponent extends EntityListPage<Host> {
  protected readonly store = inject(HostsStore);
  protected readonly columns = COLUMNS;
}
