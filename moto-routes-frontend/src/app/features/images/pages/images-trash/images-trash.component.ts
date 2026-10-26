import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IMAGE_OWNERS, Image } from '../../../../core/models/image.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button.component';
import { TrashPageComponent } from '../../../../shared/components/trash-page/trash-page.component';
import { EntityTrashPage } from '../../../../shared/pages/entity-trash-page';
import { ImagesStore } from '../../services/images.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'image', header: 'Imagen' },
  { key: 'owner', header: 'Dueño' },
  { key: 'deleted', header: 'Eliminada' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/**
 * Papelera de imágenes. Si el dueño de una imagen también está eliminado, la API no
 * la restaura (409): el listado no trae el dueño, así que el motivo llega en el aviso.
 */
@Component({
  selector: 'app-images-trash',
  imports: [DataTableComponent, TableCellDirective, RestoreButtonComponent, TrashPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-trash-page
      backPath="/images"
      [labels]="store.labels"
      [loaded]="store.deletedLoaded()"
      [failed]="loadFailed()"
      [total]="store.deletedCount()"
      [(restoreAs)]="restoreAs"
      (retry)="reload()"
    >
      <ui-data-table
        caption="Imágenes eliminadas"
        [columns]="columns"
        [rows]="store.deleted()"
        [rowKey]="rowKey"
        [loading]="showSkeleton()"
        [skeletonRows]="3"
      >
        <ng-template uiCell="image" [uiCellOf]="store.deleted()" let-image>
          <span class="cell-media">
            <span class="thumb" aria-hidden="true">
              <img [src]="image.url" alt="" loading="lazy" decoding="async" width="40" height="40" />
            </span>
            <span class="cell-title" [title]="name(image)">{{ name(image) }}</span>
          </span>
        </ng-template>
        <ng-template uiCell="owner" [uiCellOf]="store.deleted()" let-image>
          {{ owners[image.ownerType].label }}
        </ng-template>
        <ng-template uiCell="deleted" [uiCellOf]="store.deleted()" let-image>
          <time class="nowrap" [attr.datetime]="image.deletedAt">{{ deletedAgo(image) }}</time>
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="store.deleted()" let-image>
          <ui-restore-button
            [label]="name(image)"
            [busy]="store.isBusy(image._id)"
            (restore)="restore(image)"
          />
        </ng-template>
      </ui-data-table>
    </ui-trash-page>
  `,
})
export class ImagesTrashComponent extends EntityTrashPage<Image> {
  protected readonly store = inject(ImagesStore);
  protected readonly columns = COLUMNS;
  protected readonly owners = IMAGE_OWNERS;
}
