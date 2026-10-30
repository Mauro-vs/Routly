import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Bike } from '../../../../core/models/bike.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button.component';
import { TrashPageComponent } from '../../../../shared/components/trash-page/trash-page.component';
import { EntityTrashPage } from '../../../../shared/pages/entity-trash-page';
import { BikesStore } from '../../services/bikes.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'bike', header: 'Moto' },
  { key: 'owner', header: 'Dueño' },
  { key: 'was', header: 'Estaba' },
  { key: 'deleted', header: 'Eliminada' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/** Papelera de motos: las eliminadas, que se pueden restaurar. */
@Component({
  selector: 'app-bikes-trash',
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
      backPath="/bikes"
      [labels]="store.labels"
      [loaded]="store.deletedLoaded()"
      [failed]="loadFailed()"
      [total]="store.deletedCount()"
      [(restoreAs)]="restoreAs"
      (retry)="reload()"
    >
      <ui-data-table
        caption="Motos eliminadas"
        [columns]="columns"
        [rows]="store.deleted()"
        [rowKey]="rowKey"
        [loading]="showSkeleton()"
        [skeletonRows]="3"
      >
        <ng-template uiCell="bike" [uiCellOf]="store.deleted()" let-bike>
          <span class="cell-title" [title]="name(bike)">{{ name(bike) }}</span>
        </ng-template>
        <ng-template uiCell="owner" [uiCellOf]="store.deleted()" let-bike>
          {{ bike.user?.name ?? 'Eliminado' }}
        </ng-template>
        <ng-template uiCell="was" [uiCellOf]="store.deleted()" let-bike>
          <ui-status-badge [status]="bike.status" [gender]="store.labels.gender" />
        </ng-template>
        <ng-template uiCell="deleted" [uiCellOf]="store.deleted()" let-bike>
          <time class="nowrap" [attr.datetime]="bike.deletedAt">{{ deletedAgo(bike) }}</time>
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="store.deleted()" let-bike>
          <ui-restore-button
            [label]="name(bike)"
            [busy]="store.isBusy(bike._id)"
            (restore)="restore(bike)"
          />
        </ng-template>
      </ui-data-table>
    </ui-trash-page>
  `,
})
export class BikesTrashComponent extends EntityTrashPage<Bike> {
  protected readonly store = inject(BikesStore);
  protected readonly columns = COLUMNS;
}
