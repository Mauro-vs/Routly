import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Route, routeTrip } from '../../../../core/models/route.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { RelationLinkComponent } from '../../../../shared/components/relation-link/relation-link.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button.component';
import { TrashPageComponent } from '../../../../shared/components/trash-page/trash-page.component';
import { EntityTrashPage } from '../../../../shared/pages/entity-trash-page';
import { RoutesStore } from '../../services/routes.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'title', header: 'Ruta' },
  { key: 'category', header: 'Categoría' },
  { key: 'deleted', header: 'Eliminada' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/**
 * Papelera de rutas. No se restaura una cuya categoría o alguna de sus ubicaciones
 * sigue eliminada: el botón se desactiva con el motivo.
 */
@Component({
  selector: 'app-routes-trash',
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
      backPath="/routes"
      [labels]="store.labels"
      [loaded]="store.deletedLoaded()"
      [failed]="loadFailed()"
      [total]="store.deletedCount()"
      [(restoreAs)]="restoreAs"
      (retry)="reload()"
    >
      <ui-data-table
        caption="Rutas eliminadas"
        [columns]="columns"
        [rows]="store.deleted()"
        [rowKey]="rowKey"
        [loading]="showSkeleton()"
        [skeletonRows]="3"
      >
        <ng-template uiCell="title" [uiCellOf]="store.deleted()" let-route>
          <span class="cell-title" [title]="route.title">{{ route.title }}</span>
          <span class="cell-sub">{{ trip(route).text }}</span>
        </ng-template>
        <ng-template uiCell="category" [uiCellOf]="store.deleted()" let-route>
          <ui-relation-link gender="f" [label]="route.category?.name ?? null" />
        </ng-template>
        <ng-template uiCell="deleted" [uiCellOf]="store.deleted()" let-route>
          <time class="nowrap" [attr.datetime]="route.deletedAt">{{ deletedAgo(route) }}</time>
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="store.deleted()" let-route>
          <ui-restore-button
            [label]="route.title"
            [busy]="store.isBusy(route._id)"
            [blockedReason]="blockedReason(route)"
            (restore)="restore(route)"
          />
        </ng-template>
      </ui-data-table>
    </ui-trash-page>
  `,
})
export class RoutesTrashComponent extends EntityTrashPage<Route> {
  protected readonly store = inject(RoutesStore);
  protected readonly columns = COLUMNS;
  protected readonly trip = routeTrip;

  protected override blockedReason(route: Route): string | null {
    return this.store.restoreBlockedReason(route);
  }
}
