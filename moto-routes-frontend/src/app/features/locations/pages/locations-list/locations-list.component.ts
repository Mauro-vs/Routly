import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Location, locationCoordinates } from '../../../../core/models/location.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { ListPageComponent } from '../../../../shared/components/list-page/list-page.component';
import { RowActionsComponent } from '../../../../shared/components/row-actions/row-actions.component';
import { StatusToggleComponent } from '../../../../shared/components/status-toggle/status-toggle.component';
import { EntityListPage } from '../../../../shared/pages/entity-list-page';
import { LocationsStore } from '../../services/locations.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'city', header: 'Ubicación' },
  { key: 'country', header: 'País' },
  { key: 'coordinates', header: 'Coordenadas' },
  { key: 'status', header: 'Estado', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/** Listado de ubicaciones: los lugares de origen y destino de las rutas. */
@Component({
  selector: 'app-locations-list',
  imports: [
    RouterLink,
    DataTableComponent,
    TableCellDirective,
    ListPageComponent,
    RowActionsComponent,
    StatusToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-list-page
      title="Ubicaciones"
      icon="map-pin"
      createPath="/locations/new"
      trashPath="/locations/trash"
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
        caption="Ubicaciones"
        [columns]="columns"
        [rows]="pager.items()"
        [rowKey]="rowKey"
        [mutedWhen]="isInactive"
        [loading]="showSkeleton()"
      >
        <ng-template uiCell="city" [uiCellOf]="pager.items()" let-location>
          <a class="link cell-title" [routerLink]="['/locations', location.slug]" [title]="location.city">{{ location.city }}</a>
          <span class="cell-sub">{{ location.region || 'Sin región' }}</span>
        </ng-template>
        <ng-template uiCell="country" [uiCellOf]="pager.items()" let-location>
          {{ location.country }}
        </ng-template>
        <ng-template uiCell="coordinates" [uiCellOf]="pager.items()" let-location>
          @if (coordinates(location); as value) {
            <span class="num nowrap">{{ value }}</span>
          } @else {
            <span class="muted">Sin coordenadas</span>
          }
        </ng-template>
        <ng-template uiCell="status" [uiCellOf]="pager.items()" let-location>
          <ui-status-toggle
            [active]="location.isActive"
            [label]="location.city"
            [labels]="store.labels"
            [busy]="store.isBusy(location._id)"
            (activeChange)="setActive(location, $event)"
          />
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="pager.items()" let-location>
          <ui-row-actions
            [label]="location.city"
            [detailPath]="['/locations', location.slug]"
            [editPath]="['/locations', location.slug, 'edit']"
            [busy]="store.isBusy(location._id)"
            (remove)="remove(location)"
          />
        </ng-template>
      </ui-data-table>
    </ui-list-page>
  `,
})
export class LocationsListComponent extends EntityListPage<Location> {
  protected readonly store = inject(LocationsStore);
  protected readonly columns = COLUMNS;
  protected readonly coordinates = locationCoordinates;
}
