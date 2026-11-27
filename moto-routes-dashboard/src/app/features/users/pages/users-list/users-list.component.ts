import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { User } from '../../../../core/models/user.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ListPageComponent } from '../../../../shared/components/list-page/list-page.component';
import { RelationLinkComponent } from '../../../../shared/components/relation-link/relation-link.component';
import { RowActionsComponent } from '../../../../shared/components/row-actions/row-actions.component';
import { StatusToggleComponent } from '../../../../shared/components/status-toggle/status-toggle.component';
import { EntityListPage } from '../../../../shared/pages/entity-list-page';
import { ListFilter } from '../../../../shared/utils/search';
import { UsersStore } from '../../services/users.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', header: 'Usuario' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Rol' },
  { key: 'status', header: 'Estado', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/** Listado de usuarios: las cuentas de la plataforma, con su rol. */
@Component({
  selector: 'app-users-list',
  imports: [
    RouterLink,
    DataTableComponent,
    TableCellDirective,
    IconComponent,
    ListPageComponent,
    RelationLinkComponent,
    RowActionsComponent,
    StatusToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.css',
})
export class UsersListComponent extends EntityListPage<User> implements OnInit {
  protected readonly store = inject(UsersStore);
  protected override readonly listFilters: readonly ListFilter[] = [
    {
      param: 'rol',
      label: 'Filtrar por rol',
      allLabel: 'Todos los roles',
      options: () => this.store.roleOptions.items().map((role) => ({ value: role._id, label: role.label })),
      toApi: (roleId) => ({ roleId }),
    },
  ];
  protected readonly columns = COLUMNS;

  override ngOnInit(): void {
    super.ngOnInit();
    void this.store.roleOptions.load();
  }
}
