import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Role } from '../../../../core/models/role.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button/restore-button.component';
import { TrashPageComponent } from '../../../../shared/components/trash-page/trash-page.component';
import { EntityTrashPage } from '../../../../shared/pages/entity-trash-page';
import { RolesStore } from '../../services/roles.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'label', header: 'Rol' },
  { key: 'description', header: 'Descripción', wide: true, plain: true },
  { key: 'was', header: 'Estaba' },
  { key: 'deleted', header: 'Eliminado' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/** Papelera de roles: los eliminados, que se pueden restaurar. */
@Component({
  selector: 'app-roles-trash',
  imports: [
    DataTableComponent,
    TableCellDirective,
    RestoreButtonComponent,
    StatusBadgeComponent,
    TrashPageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './roles-trash.component.html',
})
export class RolesTrashComponent extends EntityTrashPage<Role> {
  protected readonly store = inject(RolesStore);
  protected readonly columns = COLUMNS;
}
