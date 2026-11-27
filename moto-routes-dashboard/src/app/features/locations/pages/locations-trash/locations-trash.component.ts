import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Location } from '../../../../core/models/location.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button/restore-button.component';
import { TrashPageComponent } from '../../../../shared/components/trash-page/trash-page.component';
import { EntityTrashPage } from '../../../../shared/pages/entity-trash-page';
import { LocationsStore } from '../../services/locations.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'city', header: 'Ubicación' },
  { key: 'country', header: 'País' },
  { key: 'was', header: 'Estaba' },
  { key: 'deleted', header: 'Eliminada' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/** Papelera de ubicaciones: las eliminadas, que se pueden restaurar. */
@Component({
  selector: 'app-locations-trash',
  imports: [
    DataTableComponent,
    TableCellDirective,
    RestoreButtonComponent,
    StatusBadgeComponent,
    TrashPageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './locations-trash.component.html',
})
export class LocationsTrashComponent extends EntityTrashPage<Location> {
  protected readonly store = inject(LocationsStore);
  protected readonly columns = COLUMNS;
}
