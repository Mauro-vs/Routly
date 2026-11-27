import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { User } from '../../../../core/models/user.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { RelationLinkComponent } from '../../../../shared/components/relation-link/relation-link.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button/restore-button.component';
import { TrashPageComponent } from '../../../../shared/components/trash-page/trash-page.component';
import { EntityTrashPage } from '../../../../shared/pages/entity-trash-page';
import { UsersStore } from '../../services/users.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', header: 'Usuario' },
  { key: 'role', header: 'Rol' },
  { key: 'was', header: 'Estaba' },
  { key: 'deleted', header: 'Eliminado' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/** Papelera de usuarios. No se restaura uno cuyo rol sigue eliminado. */
@Component({
  selector: 'app-users-trash',
  imports: [
    DataTableComponent,
    TableCellDirective,
    RelationLinkComponent,
    RestoreButtonComponent,
    StatusBadgeComponent,
    TrashPageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-trash.component.html',
})
export class UsersTrashComponent extends EntityTrashPage<User> {
  protected readonly store = inject(UsersStore);
  protected readonly columns = COLUMNS;

  protected override blockedReason(user: User): string | null {
    return this.store.restoreBlockedReason(user);
  }
}
