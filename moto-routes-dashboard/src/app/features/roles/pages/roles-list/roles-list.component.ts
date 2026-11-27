import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Role } from '../../../../core/models/role.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ListPageComponent } from '../../../../shared/components/list-page/list-page.component';
import { RowActionsComponent } from '../../../../shared/components/row-actions/row-actions.component';
import { StatusToggleComponent } from '../../../../shared/components/status-toggle/status-toggle.component';
import { EntityListPage } from '../../../../shared/pages/entity-list-page';
import { RolesStore } from '../../services/roles.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'label', header: 'Rol' },
  { key: 'description', header: 'Descripción', wide: true, plain: true },
  { key: 'type', header: 'Tipo' },
  { key: 'status', header: 'Estado', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/**
 * Listado de roles. Los roles base (admin, host, rider) no se pueden desactivar ni
 * eliminar: sus controles salen bloqueados con el motivo.
 */
@Component({
  selector: 'app-roles-list',
  imports: [
    RouterLink,
    DataTableComponent,
    TableCellDirective,
    IconComponent,
    ListPageComponent,
    RowActionsComponent,
    StatusToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './roles-list.component.html',
  styleUrl: './roles-list.component.css',
})
export class RolesListComponent extends EntityListPage<Role> {
  protected readonly store = inject(RolesStore);
  protected readonly columns = COLUMNS;

  protected override nameSort(): string {
    return 'label';
  }
}
