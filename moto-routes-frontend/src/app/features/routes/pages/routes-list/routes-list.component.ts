import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DIFFICULTIES, DIFFICULTY_LABELS, Route } from '../../../../core/models/route.model';
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
import { ListFilter, ListSort } from '../../../../shared/utils/search';
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
export class RoutesListComponent extends EntityListPage<Route> implements OnInit {
  protected readonly store = inject(RoutesStore);
  protected readonly columns = COLUMNS;
  protected readonly number = formatNumber;
  protected override readonly sorts: readonly ListSort[] = [
    { value: 'recientes', label: 'Más recientes', sort: '-createdAt' },
    { value: 'nombre', label: 'Nombre (A-Z)', sort: 'title' },
    { value: 'km', label: 'Más kilómetros', sort: '-distance' },
    { value: 'dificultad', label: 'Más difícil', sort: '-difficulty' },
  ];
  protected override readonly listFilters: readonly ListFilter[] = [
    {
      param: 'dificultad',
      label: 'Filtrar por dificultad',
      allLabel: 'Todas las dificultades',
      options: () => DIFFICULTIES.map((value) => ({ value, label: DIFFICULTY_LABELS[value] })),
      toApi: (difficulty) => ({ difficulty }),
    },
    {
      param: 'categoria',
      label: 'Filtrar por categoría',
      allLabel: 'Todas las categorías',
      // Las activas: las mismas que se pueden elegir en el formulario
      options: () => this.store.categoryOptions.items().map((category) => ({ value: category._id, label: category.name })),
      toApi: (categoryId) => ({ categoryId }),
    },
  ];

  override ngOnInit(): void {
    super.ngOnInit();
    void this.store.categoryOptions.load();
  }
}
