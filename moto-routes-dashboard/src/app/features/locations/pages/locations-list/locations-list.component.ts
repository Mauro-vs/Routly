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
  templateUrl: './locations-list.component.html',
})
export class LocationsListComponent extends EntityListPage<Location> {
  protected readonly store = inject(LocationsStore);
  protected readonly columns = COLUMNS;
  protected readonly coordinates = locationCoordinates;

  protected override nameSort(): string {
    return 'city';
  }
}
