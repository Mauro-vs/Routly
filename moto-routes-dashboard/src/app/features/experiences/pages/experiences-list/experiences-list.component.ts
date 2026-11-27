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
  templateUrl: './experiences-list.component.html',
})
export class ExperiencesListComponent extends EntityListPage<Experience> {
  protected readonly store = inject(ExperiencesStore);
  protected readonly columns = COLUMNS;
  protected readonly language = languageName;
  protected readonly number = formatNumber;

  protected override nameSort(): string {
    return 'title';
  }
}
