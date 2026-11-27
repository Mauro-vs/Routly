import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { IMAGE_OWNERS, Image } from '../../../../core/models/image.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button/restore-button.component';
import { TrashPageComponent } from '../../../../shared/components/trash-page/trash-page.component';
import { EntityTrashPage } from '../../../../shared/pages/entity-trash-page';
import { ImagesStore } from '../../services/images.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'image', header: 'Imagen' },
  { key: 'owner', header: 'Dueño' },
  { key: 'was', header: 'Estaba' },
  { key: 'deleted', header: 'Eliminada' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/**
 * Papelera de imágenes. Si el dueño de una imagen también está eliminado, la API no
 * la restaura (409): el listado no trae el dueño, así que el motivo llega en el aviso.
 */
@Component({
  selector: 'app-images-trash',
  imports: [
    DataTableComponent,
    TableCellDirective,
    RestoreButtonComponent,
    StatusBadgeComponent,
    TrashPageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './images-trash.component.html',
})
export class ImagesTrashComponent extends EntityTrashPage<Image> {
  protected readonly store = inject(ImagesStore);
  protected readonly columns = COLUMNS;
  protected readonly owners = IMAGE_OWNERS;
}
