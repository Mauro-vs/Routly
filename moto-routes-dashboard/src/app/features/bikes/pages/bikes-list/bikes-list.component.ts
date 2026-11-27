import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BIKE_TYPE_LABELS, Bike } from '../../../../core/models/bike.model';
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
import { ListSort } from '../../../../shared/utils/search';
import { EntityListPage } from '../../../../shared/pages/entity-list-page';
import { BikesStore } from '../../services/bikes.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'bike', header: 'Moto' },
  { key: 'owner', header: 'Dueño' },
  { key: 'specs', header: 'Ficha' },
  { key: 'license', header: 'Carnet' },
  { key: 'status', header: 'Estado', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/** Listado de todas las motos, con su dueño. */
@Component({
  selector: 'app-bikes-list',
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
  templateUrl: './bikes-list.component.html',
})
export class BikesListComponent extends EntityListPage<Bike> {
  protected readonly store = inject(BikesStore);
  protected readonly columns = COLUMNS;
  protected readonly typeLabels = BIKE_TYPE_LABELS;

  protected specs(bike: Bike): string {
    return [bike.cc && `${bike.cc} cc`, bike.hp && `${bike.hp} cv`].filter(Boolean).join(' · ') || 'Sin ficha';
  }
  protected override readonly sorts: readonly ListSort[] = [
    { value: 'recientes', label: 'Más recientes', sort: '-createdAt' },
    { value: 'nombre', label: 'Nombre (A-Z)', sort: 'brand,model' },
    { value: 'potencia', label: 'Más potencia', sort: '-hp' },
  ];
}
