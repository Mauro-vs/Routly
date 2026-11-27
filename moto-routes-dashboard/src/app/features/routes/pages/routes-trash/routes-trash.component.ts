import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Route, routeTrip } from '../../../../core/models/route.model';
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
import { RoutesStore } from '../../services/routes.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'title', header: 'Ruta' },
  { key: 'category', header: 'Categoría' },
  { key: 'was', header: 'Estaba' },
  { key: 'deleted', header: 'Eliminada' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/**
 * Papelera de rutas. No se restaura una cuya categoría o alguna de sus ubicaciones
 * sigue eliminada: el botón se desactiva con el motivo.
 */
@Component({
  selector: 'app-routes-trash',
  imports: [
    DataTableComponent,
    TableCellDirective,
    RelationLinkComponent,
    RestoreButtonComponent,
    StatusBadgeComponent,
    TrashPageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routes-trash.component.html',
})
export class RoutesTrashComponent extends EntityTrashPage<Route> {
  protected readonly store = inject(RoutesStore);
  protected readonly columns = COLUMNS;
  protected readonly trip = routeTrip;

  protected override blockedReason(route: Route): string | null {
    return this.store.restoreBlockedReason(route);
  }
}
