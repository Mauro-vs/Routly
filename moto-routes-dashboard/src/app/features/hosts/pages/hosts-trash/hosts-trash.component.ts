import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Host } from '../../../../core/models/host.model';
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
import { HostsStore } from '../../services/hosts.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'name', header: 'Anfitrión' },
  { key: 'user', header: 'Usuario' },
  { key: 'was', header: 'Estaba' },
  { key: 'deleted', header: 'Eliminado' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/** Papelera de anfitriones. No se restaura uno cuyo usuario sigue eliminado. */
@Component({
  selector: 'app-hosts-trash',
  imports: [
    DataTableComponent,
    TableCellDirective,
    RelationLinkComponent,
    RestoreButtonComponent,
    StatusBadgeComponent,
    TrashPageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hosts-trash.component.html',
})
export class HostsTrashComponent extends EntityTrashPage<Host> {
  protected readonly store = inject(HostsStore);
  protected readonly columns = COLUMNS;

  protected override blockedReason(host: Host): string | null {
    return this.store.restoreBlockedReason(host);
  }
}
