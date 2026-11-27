import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Departure } from '../../../../core/models/departure.model';
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
import { formatDateTime } from '../../../../shared/utils/format';
import { DeparturesStore } from '../../services/departures.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'start', header: 'Salida' },
  { key: 'experience', header: 'Experiencia' },
  { key: 'was', header: 'Estaba' },
  { key: 'deleted', header: 'Eliminada' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/** Papelera de salidas. No se restaura una cuya experiencia sigue eliminada. */
@Component({
  selector: 'app-departures-trash',
  imports: [
    DataTableComponent,
    TableCellDirective,
    RelationLinkComponent,
    RestoreButtonComponent,
    StatusBadgeComponent,
    TrashPageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './departures-trash.component.html',
})
export class DeparturesTrashComponent extends EntityTrashPage<Departure> {
  protected readonly store = inject(DeparturesStore);
  protected readonly columns = COLUMNS;
  protected readonly dateTime = formatDateTime;

  protected override blockedReason(departure: Departure): string | null {
    return this.store.restoreBlockedReason(departure);
  }
}
