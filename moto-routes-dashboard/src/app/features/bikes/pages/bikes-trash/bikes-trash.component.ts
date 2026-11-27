import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Bike } from '../../../../core/models/bike.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button/restore-button.component';
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
  templateUrl: './bikes-trash.component.html',
})
export class BikesTrashComponent extends EntityTrashPage<Bike> {
  protected readonly store = inject(BikesStore);
  protected readonly columns = COLUMNS;
}
