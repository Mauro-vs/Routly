import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Route } from '../../../../core/models/route.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { LevelMeterComponent } from '../../../../shared/components/level-meter/level-meter.component';
import { ListPageComponent } from '../../../../shared/components/list-page/list-page.component';
import { RelationLinkComponent } from '../../../../shared/components/relation-link/relation-link.component';
import { RouteGlyphComponent } from '../../../../shared/components/route-glyph/route-glyph.component';
import { RowActionsComponent } from '../../../../shared/components/row-actions/row-actions.component';
import { StatusToggleComponent } from '../../../../shared/components/status-toggle/status-toggle.component';
import { EntityListPage } from '../../../../shared/pages/entity-list-page';
import { formatNumber } from '../../../../shared/utils/format';
import { RoutesStore } from '../../services/routes.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'distance', header: 'Km', plain: true },
  { key: 'title', header: 'Ruta', plain: true, wide: true },
  { key: 'difficulty', header: 'Dificultad', plain: true },
  { key: 'category', header: 'Categoría' },
  { key: 'status', header: 'Estado', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/** Listado de rutas con el filtro por estado y las acciones de cada fila. */
@Component({
  selector: 'app-routes-list',
  imports: [
    RouterLink,
    DataTableComponent,
    TableCellDirective,
    IconComponent,
    LevelMeterComponent,
    ListPageComponent,
    RelationLinkComponent,
    RouteGlyphComponent,
    RowActionsComponent,
    StatusToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routes-list.component.html',
  styles: `
    /* la marca de hoja de ruta: el kilómetro delante */
    .mark {
      display: grid;
      gap: 2px;
      white-space: nowrap;
    }

    .mark b {
      font-size: 1.375rem;
      line-height: 1;
    }

    .mark span {
      font-size: 11.5px;
      color: var(--color-text-muted);
    }

    .route {
      display: grid;
      min-width: 0;
    }

    .trip {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0 6px;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .trip ui-icon {
      font-size: 12px;
    }
  `,
})
export class RoutesListComponent extends EntityListPage<Route> {
  protected readonly store = inject(RoutesStore);
  protected readonly columns = COLUMNS;
  protected readonly number = formatNumber;
}
