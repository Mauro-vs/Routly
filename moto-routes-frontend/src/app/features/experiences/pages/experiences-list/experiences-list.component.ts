import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Experience, languageName } from '../../../../core/models/experience.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { ListPageComponent } from '../../../../shared/components/list-page/list-page.component';
import { RelationLinkComponent } from '../../../../shared/components/relation-link/relation-link.component';
import { RowActionsComponent } from '../../../../shared/components/row-actions/row-actions.component';
import { StatusToggleComponent } from '../../../../shared/components/status-toggle/status-toggle.component';
import { EntityListPage } from '../../../../shared/pages/entity-list-page';
import { formatNumber } from '../../../../shared/utils/format';
import { ExperiencesStore } from '../../services/experiences.store';

const COLUMNS: readonly TableColumn[] = [
  { key: 'title', header: 'Experiencia' },
  { key: 'route', header: 'Ruta' },
  { key: 'host', header: 'Anfitrión' },
  { key: 'participants', header: 'Plazas', align: 'end' },
  { key: 'duration', header: 'Duración', align: 'end' },
  { key: 'status', header: 'Estado', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/** Listado de experiencias: las salidas guiadas que organiza un anfitrión sobre una ruta. */
@Component({
  selector: 'app-experiences-list',
  imports: [
    RouterLink,
    DataTableComponent,
    TableCellDirective,
    ListPageComponent,
    RelationLinkComponent,
    RowActionsComponent,
    StatusToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-list-page
      title="Experiencias"
      icon="compass"
      createPath="/experiences/new"
      trashPath="/experiences/trash"
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
        caption="Experiencias"
        [columns]="columns"
        [rows]="pager.items()"
        [rowKey]="rowKey"
        [mutedWhen]="isInactive"
        [loading]="showSkeleton()"
      >
        <ng-template uiCell="title" [uiCellOf]="pager.items()" let-experience>
          <a class="link cell-title" [routerLink]="['/experiences', experience.slug]">{{ experience.title }}</a>
          <span class="cell-sub">{{ language(experience.language) }}</span>
        </ng-template>
        <ng-template uiCell="route" [uiCellOf]="pager.items()" let-experience>
          <ui-relation-link
            gender="f"
            [label]="experience.route?.title ?? null"
            [path]="experience.route ? ['/routes', experience.route.slug] : null"
          />
        </ng-template>
        <ng-template uiCell="host" [uiCellOf]="pager.items()" let-experience>
          <ui-relation-link
            [label]="experience.host?.name ?? null"
            [path]="experience.host ? ['/hosts', experience.host.slug] : null"
          />
        </ng-template>
        <ng-template uiCell="participants" [uiCellOf]="pager.items()" let-experience>
          {{ experience.minParticipants }}–{{ experience.maxParticipants }}
        </ng-template>
        <ng-template uiCell="duration" [uiCellOf]="pager.items()" let-experience>
          {{ number(experience.duration) }}&nbsp;h
        </ng-template>
        <ng-template uiCell="status" [uiCellOf]="pager.items()" let-experience>
          <ui-status-toggle
            [active]="experience.isActive"
            [label]="experience.title"
            [labels]="store.labels"
            [busy]="store.isBusy(experience._id)"
            (activeChange)="setActive(experience, $event)"
          />
        </ng-template>
        <ng-template uiCell="actions" [uiCellOf]="pager.items()" let-experience>
          <ui-row-actions
            [label]="experience.title"
            [detailPath]="['/experiences', experience.slug]"
            [editPath]="['/experiences', experience.slug, 'edit']"
            [busy]="store.isBusy(experience._id)"
            (remove)="remove(experience)"
          />
        </ng-template>
      </ui-data-table>
    </ui-list-page>
  `,
})
export class ExperiencesListComponent extends EntityListPage<Experience> {
  protected readonly store = inject(ExperiencesStore);
  protected readonly columns = COLUMNS;
  protected readonly language = languageName;
  protected readonly number = formatNumber;
}
