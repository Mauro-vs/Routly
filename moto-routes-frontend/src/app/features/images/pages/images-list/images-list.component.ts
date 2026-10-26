import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IMAGE_OWNERS, Image, imageOwnerPath } from '../../../../core/models/image.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ListPageComponent } from '../../../../shared/components/list-page/list-page.component';
import { RowActionsComponent } from '../../../../shared/components/row-actions/row-actions.component';
import { StatusToggleComponent } from '../../../../shared/components/status-toggle/status-toggle.component';
import { EntityListPage } from '../../../../shared/pages/entity-list-page';
import { ImagesStore } from '../../services/images.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'image', header: 'Imagen' },
  { key: 'owner', header: 'Dueño' },
  { key: 'cover', header: 'Principal' },
  { key: 'position', header: 'Posición', align: 'end' },
  { key: 'status', header: 'Estado', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/**
 * Todas las imágenes del panel, de cualquier dueño. Se crean desde la galería de su
 * dueño; aquí se revisan, se editan y se eliminan. El dueño se enlaza por su `_id`
 * (la API no trae su nombre: propuesta en NOTES.md).
 */
@Component({
  selector: 'app-images-list',
  imports: [
    RouterLink,
    DataTableComponent,
    TableCellDirective,
    IconComponent,
    ListPageComponent,
    RowActionsComponent,
    StatusToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-list-page
      title="Imágenes"
      icon="images"
      trashPath="/images/trash"
      emptyDescription="Se añaden desde la galería de una ruta, un usuario, una categoría…"
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
        caption="Imágenes"
        [columns]="columns"
        [rows]="pager.items()"
        [rowKey]="rowKey"
        [mutedWhen]="isInactive"
        [loading]="showSkeleton()"
      >
        <ng-template uiCell="image" [uiCellOf]="pager.items()" let-image>
          <span class="cell-media">
            <span class="thumb" aria-hidden="true">
              <img [src]="image.url" alt="" loading="lazy" decoding="async" width="40" height="40" />
            </span>
            <a class="link cell-title" [routerLink]="['/images', image._id]">{{ name(image) }}</a>
          </span>
        </ng-template>
        <ng-template uiCell="owner" [uiCellOf]="pager.items()" let-image>
          <a class="link" [routerLink]="ownerPath(image)">{{ owners[image.ownerType].label }}</a>
          <span class="cell-sub mono" translate="no">…{{ image.ownerId.slice(-6) }}</span>
        </ng-template>
        <ng-template uiCell="cover" [uiCellOf]="pager.items()" let-image>
          @if (image.isCover) {
            <span class="badge badge--icon badge--info"><ui-icon name="star" />Principal</span>
          } @else {
            <span class="muted">No</span>
          }
        </ng-template>
        <ng-template uiCell="position" [uiCellOf]="pager.items()" let-image>
          {{ image.position + 1 }}
        </ng-template>
        <ng-template uiCell="status" [uiCellOf]="pager.items()" let-image>
          <ui-status-toggle
            [active]="image.isActive"
            [label]="name(image)"
            [labels]="store.labels"
            [busy]="store.isBusy(image._id)"
            (activeChange)="setActive(image, $event)"
          />
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="pager.items()" let-image>
          <ui-row-actions
            [label]="name(image)"
            [detailPath]="['/images', image._id]"
            [editPath]="['/images', image._id, 'edit']"
            [busy]="store.isBusy(image._id)"
            (remove)="remove(image)"
          />
        </ng-template>
      </ui-data-table>
    </ui-list-page>
  `,
  styles: `
    .mono {
      font-family: var(--font-mono);
    }
  `,
})
export class ImagesListComponent extends EntityListPage<Image> {
  protected readonly store = inject(ImagesStore);
  protected readonly columns = COLUMNS;
  protected readonly owners = IMAGE_OWNERS;
  protected readonly ownerPath = imageOwnerPath;
}
