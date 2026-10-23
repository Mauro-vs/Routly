import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Location } from '../../../../core/models/location.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button.component';
import { TrashPageComponent } from '../../../../shared/components/trash-page/trash-page.component';
import { EntityTrashPage } from '../../../../shared/pages/entity-trash-page';
import { LocationsStore } from '../../services/locations.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'city', header: 'Ubicación' },
  { key: 'country', header: 'País' },
  { key: 'deleted', header: 'Eliminada' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/** Papelera de ubicaciones: las eliminadas, que se pueden restaurar. */
@Component({
  selector: 'app-locations-trash',
  imports: [DataTableComponent, TableCellDirective, RestoreButtonComponent, TrashPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-trash-page
      backPath="/locations"
      [labels]="store.labels"
      [loaded]="store.deletedLoaded()"
      [failed]="loadFailed()"
      [total]="store.deletedCount()"
      [(restoreAs)]="restoreAs"
      (retry)="reload()"
    >
      <ui-data-table
        caption="Ubicaciones eliminadas"
        [columns]="columns"
        [rows]="store.deleted()"
        [rowKey]="rowKey"
        [loading]="showSkeleton()"
        [skeletonRows]="3"
      >
        <ng-template uiCell="city" [uiCellOf]="store.deleted()" let-location>
          <span class="cell-title">{{ location.city }}</span>
          <span class="cell-sub">{{ location.region || 'Sin región' }}</span>
        </ng-template>
        <ng-template uiCell="country" [uiCellOf]="store.deleted()" let-location>
          {{ location.country }}
        </ng-template>
        <ng-template uiCell="deleted" [uiCellOf]="store.deleted()" let-location>
          <time class="nowrap" [attr.datetime]="location.deletedAt">{{ deletedAgo(location) }}</time>
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="store.deleted()" let-location>
          <ui-restore-button
            [label]="location.city"
            [busy]="store.isBusy(location._id)"
            (restore)="restore(location)"
          />
        </ng-template>
      </ui-data-table>
    </ui-trash-page>
  `,
})
export class LocationsTrashComponent extends EntityTrashPage<Location> {
  protected readonly store = inject(LocationsStore);
  protected readonly columns = COLUMNS;
}
