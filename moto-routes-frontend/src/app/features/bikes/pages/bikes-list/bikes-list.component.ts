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
  template: `
    <ui-list-page
      title="Motos"
      icon="motorcycle"
      createPath="/bikes/new"
      trashPath="/bikes/trash"
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
        caption="Motos"
        [columns]="columns"
        [rows]="pager.items()"
        [rowKey]="rowKey"
        [mutedWhen]="isInactive"
        [loading]="showSkeleton()"
      >
        <ng-template uiCell="bike" [uiCellOf]="pager.items()" let-bike>
          <span class="cell-media">
            <span class="thumb" aria-hidden="true">
              @if (bike.coverImage; as cover) {
                <img [src]="cover.url" alt="" loading="lazy" decoding="async" width="40" height="40" />
              } @else {
                <ui-icon name="motorcycle" />
              }
            </span>
            <span>
              <a class="link cell-title" [routerLink]="['/bikes', bike.slug]" [title]="name(bike)">{{ name(bike) }}</a>
              <span class="cell-sub">{{ typeLabels[bike.type] }}{{ bike.isPublic ? '' : ' · Privada' }}</span>
            </span>
          </span>
        </ng-template>
        <ng-template uiCell="owner" [uiCellOf]="pager.items()" let-bike>
          <ui-relation-link
            [label]="bike.user?.name ?? null"
            [path]="bike.user ? ['/users', bike.user.slug] : null"
          />
        </ng-template>
        <ng-template uiCell="specs" [uiCellOf]="pager.items()" let-bike>
          <span class="num nowrap">{{ specs(bike) }}</span>
        </ng-template>
        <ng-template uiCell="license" [uiCellOf]="pager.items()" let-bike>
          <b class="slanted">{{ bike.license }}</b>
        </ng-template>
        <ng-template uiCell="status" [uiCellOf]="pager.items()" let-bike>
          <ui-status-toggle
            [active]="bike.isActive"
            [label]="name(bike)"
            [labels]="store.labels"
            [busy]="store.isBusy(bike._id)"
            (activeChange)="setActive(bike, $event)"
          />
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="pager.items()" let-bike>
          <ui-row-actions
            [label]="name(bike)"
            [detailPath]="['/bikes', bike.slug]"
            [editPath]="['/bikes', bike.slug, 'edit']"
            [busy]="store.isBusy(bike._id)"
            (remove)="remove(bike)"
          />
        </ng-template>
      </ui-data-table>
    </ui-list-page>
  `,
})
export class BikesListComponent extends EntityListPage<Bike> {
  protected readonly store = inject(BikesStore);
  protected readonly columns = COLUMNS;
  protected readonly typeLabels = BIKE_TYPE_LABELS;

  protected specs(bike: Bike): string {
    return [bike.cc && `${bike.cc} cc`, bike.hp && `${bike.hp} cv`].filter(Boolean).join(' · ') || 'Sin ficha';
  }
}
