import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Host } from '../../../../core/models/host.model';
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
import { HostsStore } from '../../services/hosts.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', header: 'Anfitrión' },
  { key: 'user', header: 'Usuario' },
  { key: 'biography', header: 'Biografía', wide: true, plain: true },
  { key: 'status', header: 'Estado', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/** Listado de anfitriones: los perfiles públicos de los guías, con su usuario. */
@Component({
  selector: 'app-hosts-list',
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
  templateUrl: './hosts-list.component.html',
})
export class HostsListComponent extends EntityListPage<Host> {
  protected readonly store = inject(HostsStore);
  protected readonly columns = COLUMNS;
}
