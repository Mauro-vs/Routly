import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Departure } from '../../../../core/models/departure.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { ListPageComponent } from '../../../../shared/components/list-page/list-page.component';
import { RelationLinkComponent } from '../../../../shared/components/relation-link/relation-link.component';
import { RowActionsComponent } from '../../../../shared/components/row-actions/row-actions.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { StatusToggleComponent } from '../../../../shared/components/status-toggle/status-toggle.component';
import { EntityListPage } from '../../../../shared/pages/entity-list-page';
import { formatDateTime, formatMoney } from '../../../../shared/utils/format';
import { DeparturesStore } from '../../services/departures.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'start', header: 'Salida' },
  { key: 'experience', header: 'Experiencia' },
  { key: 'capacity', header: 'Plazas', align: 'end' },
  { key: 'price', header: 'Precio', align: 'end' },
  { key: 'state', header: 'Estado de la salida' },
  { key: 'status', header: 'Estado', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/**
 * Listado de salidas: las fechas concretas de cada experiencia. El estado de la
 * salida (programada, cancelada, realizada) es aparte de si está activa en el panel.
 */
@Component({
  selector: 'app-departures-list',
  imports: [
    RouterLink,
    DataTableComponent,
    TableCellDirective,
    ListPageComponent,
    RelationLinkComponent,
    RowActionsComponent,
    StatusBadgeComponent,
    StatusToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-list-page
      title="Salidas"
      icon="calendar-blank"
      createPath="/departures/new"
      trashPath="/departures/trash"
      [labels]="store.labels"
      [loaded]="store.loaded()"
      [failed]="loadFailed()"
      [counts]="counts()"
      [total]="pager.total()"
      [pageSize]="pager.pageSize"
      [trashCount]="store.deletedCount()"
      [status]="store.status()"
      (statusChange)="setStatus($event)"
      [(page)]="pager.page"
      (retry)="reload()"
    >
      <ui-data-table
        caption="Salidas"
        [columns]="columns"
        [rows]="pager.items()"
        [rowKey]="rowKey"
        [mutedWhen]="isInactive"
        [loading]="showSkeleton()"
      >
        <ng-template uiCell="start" [uiCellOf]="pager.items()" let-departure>
          <a class="link cell-title nowrap" [routerLink]="['/departures', departure.slug]">
            <time [attr.datetime]="departure.startAt">{{ dateTime(departure.startAt) }}</time>
          </a>
          <span class="cell-sub" translate="no">{{ departure.sku }}</span>
        </ng-template>
        <ng-template uiCell="experience" [uiCellOf]="pager.items()" let-departure>
          <ui-relation-link
            gender="f"
            [label]="departure.experience?.title ?? null"
            [path]="departure.experience ? ['/experiences', departure.experience.slug] : null"
          />
        </ng-template>
        <ng-template uiCell="capacity" [uiCellOf]="pager.items()" let-departure>
          {{ departure.capacity }}
        </ng-template>
        <ng-template uiCell="price" [uiCellOf]="pager.items()" let-departure>
          {{ money(departure.price) }}
        </ng-template>
        <ng-template uiCell="state" [uiCellOf]="pager.items()" let-departure>
          <ui-status-badge gender="f" [status]="departure.state" />
        </ng-template>
        <ng-template uiCell="status" [uiCellOf]="pager.items()" let-departure>
          <ui-status-toggle
            [active]="departure.isActive"
            [label]="name(departure)"
            [labels]="store.labels"
            [busy]="store.isBusy(departure._id)"
            (activeChange)="setActive(departure, $event)"
          />
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="pager.items()" let-departure>
          <ui-row-actions
            [label]="name(departure)"
            [detailPath]="['/departures', departure.slug]"
            [editPath]="['/departures', departure.slug, 'edit']"
            [busy]="store.isBusy(departure._id)"
            (remove)="remove(departure)"
          />
        </ng-template>
      </ui-data-table>
    </ui-list-page>
  `,
})
export class DeparturesListComponent extends EntityListPage<Departure> {
  protected readonly store = inject(DeparturesStore);
  protected readonly columns = COLUMNS;
  protected readonly dateTime = formatDateTime;
  protected readonly money = formatMoney;
}
