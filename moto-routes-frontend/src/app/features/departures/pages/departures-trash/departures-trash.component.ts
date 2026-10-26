import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Departure } from '../../../../core/models/departure.model';
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
import { formatDateTime } from '../../../../shared/utils/format';
import { DeparturesStore } from '../../services/departures.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'start', header: 'Salida' },
  { key: 'experience', header: 'Experiencia' },
  { key: 'was', header: 'Estaba' },
  { key: 'deleted', header: 'Eliminada' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/** Papelera de salidas. No se restaura una cuya experiencia sigue eliminada. */
@Component({
  selector: 'app-departures-trash',
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
      backPath="/departures"
      [labels]="store.labels"
      [loaded]="store.deletedLoaded()"
      [failed]="loadFailed()"
      [total]="store.deletedCount()"
      [(restoreAs)]="restoreAs"
      (retry)="reload()"
    >
      <ui-data-table
        caption="Salidas eliminadas"
        [columns]="columns"
        [rows]="store.deleted()"
        [rowKey]="rowKey"
        [loading]="showSkeleton()"
        [skeletonRows]="3"
      >
        <ng-template uiCell="start" [uiCellOf]="store.deleted()" let-departure>
          <time class="cell-title nowrap" [attr.datetime]="departure.startAt">{{ dateTime(departure.startAt) }}</time>
          <span class="cell-sub" translate="no">{{ departure.sku }}</span>
        </ng-template>
        <ng-template uiCell="experience" [uiCellOf]="store.deleted()" let-departure>
          <ui-relation-link gender="f" [label]="departure.experience?.title ?? null" />
        </ng-template>
        <ng-template uiCell="was" [uiCellOf]="store.deleted()" let-departure>
          <ui-status-badge [status]="departure.status" [gender]="store.labels.gender" />
        </ng-template>
        <ng-template uiCell="deleted" [uiCellOf]="store.deleted()" let-departure>
          <time class="nowrap" [attr.datetime]="departure.deletedAt">{{ deletedAgo(departure) }}</time>
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="store.deleted()" let-departure>
          <ui-restore-button
            [label]="name(departure)"
            [busy]="store.isBusy(departure._id)"
            [blockedReason]="blockedReason(departure)"
            (restore)="restore(departure)"
          />
        </ng-template>
      </ui-data-table>
    </ui-trash-page>
  `,
})
export class DeparturesTrashComponent extends EntityTrashPage<Departure> {
  protected readonly store = inject(DeparturesStore);
  protected readonly columns = COLUMNS;
  protected readonly dateTime = formatDateTime;

  protected override blockedReason(departure: Departure): string | null {
    return this.store.restoreBlockedReason(departure);
  }
}
