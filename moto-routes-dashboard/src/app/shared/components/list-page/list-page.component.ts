import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LoadFailure, failureError } from '../../../core/models/api-error.model';
import { StatusFilter } from '../../../core/services/entity.store';
import {
  CollectionLabels,
  agree,
  countLabel,
  newLabel,
  statusFilterLabels,
  statusWord,
} from '../../utils/labels';
import { RouterPath } from '../../utils/router';
import { ListFilter, ListSort } from '../../utils/search';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ErrorStateComponent } from '../error-state/error-state.component';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icons.generated';
import { PageHeaderComponent } from '../page-header/page-header.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { SegmentOption, SegmentedComponent } from '../segmented/segmented.component';

export interface StatusCounts {
  all: number;
  active: number;
  inactive: number;
}

/**
 * Marco común de los listados: cabecera con el acceso a la papelera, filtro por
 * estado, los estados de error y de vacío, y la paginación. La tabla la pone cada
 * página dentro, con sus propias celdas:
 *
 *   <ui-list-page title="Rutas" [labels]="labels" ... [(status)]="..." [(page)]="pager.page">
 *     <ui-data-table ... />
 *   </ui-list-page>
 *
 * Con `[listToolbar]` se añaden controles junto al filtro.
 */
@Component({
  selector: 'ui-list-page',
  imports: [
    RouterLink,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    PageHeaderComponent,
    PaginationComponent,
    SegmentedComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list-page.component.html',
  styleUrl: './list-page.component.css',
})
export class ListPageComponent {
  readonly title = input.required<string>();
  /** Si no se da, se escribe con el total: "5 rutas". */
  readonly subtitle = input('');
  readonly labels = input.required<CollectionLabels>();
  /** Icono del estado vacío: el de la sección en el menú. */
  readonly icon = input.required<IconName>();
  /** La primera carga ha terminado. Hasta entonces no se juzga si está vacío. */
  readonly loaded = input.required<boolean>();
  /** Llega otra página: la que se ve se atenúa y sale la barra de carga. */
  readonly refreshing = input(false);
  /** La primera carga ha fallado: se muestra el error con "Reintentar". */
  /** El error de la carga (o solo si ha fallado): el recuadro de error cuenta el motivo. */
  readonly failed = input<LoadFailure>(false);
  protected readonly loadError = computed(() => failureError(this.failed()));
  /** Cuántos hay en total y de cada estado, para el filtro. */
  readonly counts = input.required<StatusCounts>();
  /** Cuántos quedan después del filtro, para la paginación. */
  readonly total = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly createPath = input<RouterPath | null>(null);
  /** Texto del estado vacío, si no se crean desde aquí (las imágenes). */
  readonly emptyDescription = input('');
  readonly trashPath = input<RouterPath | null>(null);
  readonly trashCount = input<number | null>(null);

  readonly status = model.required<StatusFilter>();
  readonly page = model.required<number>();
  /** El texto del buscador. */
  readonly query = model('');
  readonly sorts = input<readonly ListSort[]>([]);
  readonly sort = model('');
  /** Los filtros propios de la colección y el valor de cada uno, por su `param`. */
  readonly filters = input<readonly ListFilter[]>([]);
  readonly filterValues = input<Readonly<Record<string, string>>>({});
  readonly filterChange = output<{ param: string; value: string }>();
  readonly clearFilters = output<void>();
  readonly retry = output<void>();
  protected readonly hasFilters = computed(() => Object.values(this.filterValues()).some(Boolean));
  /** "Ninguna ruta con estos filtros", "Ningún usuario con estos filtros". */
  protected readonly filtersEmptyTitle = computed(() => {
    const { singular, gender } = this.labels();
    return `${agree(gender, 'Ninguna', 'Ningún')} ${singular} con estos filtros`;
  });

  protected readonly statusLabels = computed(() => statusFilterLabels(this.labels().gender));
  protected readonly statusOptions = computed<SegmentOption<StatusFilter>[]>(() => {
    const labels = this.statusLabels();
    const counts = this.counts();
    return [
      { value: 'all', label: labels.all, count: counts.all },
      { value: 'active', label: labels.active, count: counts.active },
      { value: 'inactive', label: labels.inactive, count: counts.inactive },
    ];
  });

  protected readonly subtitleText = computed(() => {
    if (this.subtitle()) return this.subtitle();
    // Si la carga ha fallado ya no se está cargando: el recuadro de error cuenta el motivo
    if (this.failed()) return '';
    if (!this.loaded()) return 'Cargando…';
    return `${countLabel(this.counts().all, this.labels())}.`;
  });

  protected readonly errorTitle = computed(() => {
    const { plural, gender } = this.labels();
    return `No se han podido cargar ${agree(gender, 'las', 'los')} ${plural}`;
  });
  protected readonly createLabel = computed(() => newLabel(this.labels()));
  protected readonly emptyText = computed(() => {
    if (this.emptyDescription()) return this.emptyDescription();
    const { gender } = this.labels();
    return `Crea ${agree(gender, 'la primera', 'el primero')} para que aparezca aquí.`;
  });
  protected readonly filteredEmptyTitle = computed(() => {
    const { plural, gender } = this.labels();
    const state = this.status() === 'active' ? 'active' : 'inactive';
    return `No hay ${plural} ${statusWord(state, gender)}s`;
  });

  protected deletedOne(): string {
    const { singular, gender } = this.labels();
    return `${singular} ${statusWord('deleted', gender)}`;
  }

  protected deletedMany(): string {
    const { plural, gender } = this.labels();
    return `${plural} ${statusWord('deleted', gender)}s`;
  }
}
