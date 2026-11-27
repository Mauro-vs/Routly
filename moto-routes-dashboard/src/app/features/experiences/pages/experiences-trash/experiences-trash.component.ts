import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Experience } from '../../../../core/models/experience.model';
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
import { ExperiencesStore } from '../../services/experiences.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'title', header: 'Experiencia' },
  { key: 'route', header: 'Ruta' },
  { key: 'host', header: 'Anfitrión' },
  { key: 'was', header: 'Estaba' },
  { key: 'deleted', header: 'Eliminada' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/** Papelera de experiencias. No se restaura una cuya ruta o anfitrión siguen eliminados. */
@Component({
  selector: 'app-experiences-trash',
  imports: [
    DataTableComponent,
    TableCellDirective,
    RelationLinkComponent,
    RestoreButtonComponent,
    StatusBadgeComponent,
    TrashPageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experiences-trash.component.html',
})
export class ExperiencesTrashComponent extends EntityTrashPage<Experience> {
  protected readonly store = inject(ExperiencesStore);
  protected readonly columns = COLUMNS;

  protected override blockedReason(experience: Experience): string | null {
    return this.store.restoreBlockedReason(experience);
  }
}
