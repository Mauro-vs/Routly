import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Host } from '../../../../core/models/host.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { RelationLinkComponent } from '../../../../shared/components/relation-link/relation-link.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button.component';
import { TrashPageComponent } from '../../../../shared/components/trash-page/trash-page.component';
import { EntityTrashPage } from '../../../../shared/pages/entity-trash-page';
import { HostsStore } from '../../services/hosts.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', header: 'Anfitrión' },
  { key: 'user', header: 'Usuario' },
  { key: 'deleted', header: 'Eliminado' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/** Papelera de anfitriones. No se restaura uno cuyo usuario sigue eliminado. */
@Component({
  selector: 'app-hosts-trash',
  imports: [
    DataTableComponent,
    TableCellDirective,
    RelationLinkComponent,
    RestoreButtonComponent,
    TrashPageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-trash-page
      backPath="/hosts"
      [labels]="store.labels"
      [loaded]="store.deletedLoaded()"
      [failed]="loadFailed()"
      [total]="store.deletedCount()"
      [(restoreAs)]="restoreAs"
      (retry)="reload()"
    >
      <ui-data-table
        caption="Anfitriones eliminados"
        [columns]="columns"
        [rows]="store.deleted()"
        [rowKey]="rowKey"
        [loading]="showSkeleton()"
        [skeletonRows]="3"
      >
        <ng-template uiCell="name" [uiCellOf]="store.deleted()" let-host>
          <span class="cell-title" [title]="host.name">{{ host.name }}</span>
        </ng-template>
        <ng-template uiCell="user" [uiCellOf]="store.deleted()" let-host>
          <ui-relation-link [label]="host.user?.name ?? null" />
        </ng-template>
        <ng-template uiCell="deleted" [uiCellOf]="store.deleted()" let-host>
          <time class="nowrap" [attr.datetime]="host.deletedAt">{{ deletedAgo(host) }}</time>
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="store.deleted()" let-host>
          <ui-restore-button
            [label]="host.name"
            [busy]="store.isBusy(host._id)"
            [blockedReason]="blockedReason(host)"
            (restore)="restore(host)"
          />
        </ng-template>
      </ui-data-table>
    </ui-trash-page>
  `,
})
export class HostsTrashComponent extends EntityTrashPage<Host> {
  protected readonly store = inject(HostsStore);
  protected readonly columns = COLUMNS;

  protected override blockedReason(host: Host): string | null {
    return this.store.restoreBlockedReason(host);
  }
}
