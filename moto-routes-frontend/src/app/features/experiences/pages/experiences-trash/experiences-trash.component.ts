import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Experience } from '../../../../core/models/experience.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { RelationLinkComponent } from '../../../../shared/components/relation-link/relation-link.component';
import { RestoreButtonComponent } from '../../../../shared/components/trash-page/restore-button.component';
import { TrashPageComponent } from '../../../../shared/components/trash-page/trash-page.component';
import { EntityTrashPage } from '../../../../shared/pages/entity-trash-page';
import { ExperiencesStore } from '../../services/experiences.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'title', header: 'Experiencia' },
  { key: 'route', header: 'Ruta' },
  { key: 'host', header: 'Anfitrión' },
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
    TrashPageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-trash-page
      backPath="/experiences"
      [labels]="store.labels"
      [loaded]="store.deletedLoaded()"
      [failed]="loadFailed()"
      [total]="store.deletedCount()"
      [(restoreAs)]="restoreAs"
      (retry)="reload()"
    >
      <ui-data-table
        caption="Experiencias eliminadas"
        [columns]="columns"
        [rows]="store.deleted()"
        [rowKey]="rowKey"
        [loading]="showSkeleton()"
        [skeletonRows]="3"
      >
        <ng-template uiCell="title" [uiCellOf]="store.deleted()" let-experience>
          <span class="cell-title">{{ experience.title }}</span>
        </ng-template>
        <ng-template uiCell="route" [uiCellOf]="store.deleted()" let-experience>
          <ui-relation-link gender="f" [label]="experience.route?.title ?? null" />
        </ng-template>
        <ng-template uiCell="host" [uiCellOf]="store.deleted()" let-experience>
          <ui-relation-link [label]="experience.host?.name ?? null" />
        </ng-template>
        <ng-template uiCell="deleted" [uiCellOf]="store.deleted()" let-experience>
          <time class="nowrap" [attr.datetime]="experience.deletedAt">{{ deletedAgo(experience) }}</time>
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="store.deleted()" let-experience>
          <ui-restore-button
            [label]="experience.title"
            [busy]="store.isBusy(experience._id)"
            [blockedReason]="blockedReason(experience)"
            (restore)="restore(experience)"
          />
        </ng-template>
      </ui-data-table>
    </ui-trash-page>
  `,
})
export class ExperiencesTrashComponent extends EntityTrashPage<Experience> {
  protected readonly store = inject(ExperiencesStore);
  protected readonly columns = COLUMNS;

  protected override blockedReason(experience: Experience): string | null {
    return this.store.restoreBlockedReason(experience);
  }
}
