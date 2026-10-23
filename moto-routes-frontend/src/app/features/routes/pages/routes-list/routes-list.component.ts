import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  DIFFICULTIES,
  DIFFICULTY_BADGES,
  DIFFICULTY_LABELS,
  Route,
  routeTrip,
} from '../../../../core/models/route.model';
import { StatusFilter } from '../../../../core/services/entity.store';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SearchInputComponent } from '../../../../shared/components/search-input/search-input.component';
import {
  SegmentOption,
  SegmentedComponent,
} from '../../../../shared/components/segmented/segmented.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ToggleComponent } from '../../../../shared/components/toggle/toggle.component';
import { formatNumber, formatRelativeTime } from '../../../../shared/utils/format';
import { RouteCardComponent } from '../../components/route-card/route-card.component';
import { DifficultyFilter, RoutesStore, RoutesView } from '../../services/routes.store';

const PAGE_SIZE = 12;

const TABLE_COLUMNS: readonly TableColumn[] = [
  { key: 'title', header: 'Ruta' },
  { key: 'trip', header: 'Recorrido', wide: true, plain: true },
  { key: 'difficulty', header: 'Dificultad', plain: true },
  { key: 'distance', header: 'Distancia', align: 'end' },
  { key: 'duration', header: 'Duración', align: 'end' },
  { key: 'state', header: 'Estado', plain: true },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end' },
];

/** Listado de rutas, en tarjetas o en lista, con búsqueda, filtros y cambio de estado. */
@Component({
  selector: 'app-routes-list',
  imports: [
    RouterLink,
    DataTableComponent,
    TableCellDirective,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    PageHeaderComponent,
    PaginationComponent,
    SearchInputComponent,
    SegmentedComponent,
    SkeletonComponent,
    ToggleComponent,
    RouteCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routes-list.component.html',
  styleUrl: './routes-list.component.css',
})
export class RoutesListComponent {
  protected readonly store = inject(RoutesStore);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly columns = TABLE_COLUMNS;
  protected readonly skeletonCards = [0, 1, 2, 3, 4, 5];
  protected readonly difficultyLabels = DIFFICULTY_LABELS;
  protected readonly difficultyBadges = DIFFICULTY_BADGES;
  protected readonly difficultyOptions = DIFFICULTIES.map((value) => ({
    value,
    label: DIFFICULTY_LABELS[value],
  }));
  protected readonly viewOptions: SegmentOption<RoutesView>[] = [
    { value: 'cards', label: 'Ver en tarjetas', icon: 'squares-four' },
    { value: 'table', label: 'Ver en lista', icon: 'list-bullets' },
  ];
  protected readonly statusOptions = computed<SegmentOption<StatusFilter>[]>(() => [
    { value: 'all', label: 'Todas', count: this.store.total() },
    { value: 'active', label: 'Activas', count: this.store.activeCount() },
    { value: 'inactive', label: 'Inactivas', count: this.store.inactiveCount() },
  ]);

  /** Primera carga en curso: se pintan los skeletons. Las recargas no los muestran. */
  protected readonly showSkeleton = computed(() => this.store.loading() && !this.store.loaded());
  protected readonly loadFailed = computed(
    () => !this.store.loaded() && !this.store.loading() && this.store.error() !== null,
  );

  protected readonly subtitle = computed(() => {
    if (!this.store.loaded()) return 'Cargando el catálogo…';
    const total = this.store.total();
    const count = total === 1 ? '1 ruta' : `${total} rutas`;
    return `${count}. El cambio de estado se guarda al momento.`;
  });

  private readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.store.filtered().length / PAGE_SIZE)),
  );
  private readonly filterKey = computed(
    () => `${this.store.search()}|${this.store.status()}|${this.store.difficulty()}`,
  );

  /** Vuelve a la página 1 al cambiar un filtro y no se queda en una página que ya no existe. */
  protected readonly page = linkedSignal<{ key: string; pages: number }, number>({
    source: () => ({ key: this.filterKey(), pages: this.pageCount() }),
    computation: (source, previous) =>
      previous && previous.source.key === source.key ? Math.min(previous.value, source.pages) : 1,
  });

  protected readonly pageItems = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.store.filtered().slice(start, start + PAGE_SIZE);
  });

  protected readonly rowKey = (route: Route): string => route._id;
  protected readonly isInactive = (route: Route): boolean => !route.isActive;
  protected readonly trip = routeTrip;

  constructor() {
    void this.store.load();
    // Para el contador del acceso a la papelera.
    void this.store.loadDeleted();
  }

  protected reload(): void {
    void this.store.load();
  }

  protected setDifficulty(value: string): void {
    const match = DIFFICULTIES.find((difficulty) => difficulty === value);
    const filter: DifficultyFilter = match ?? 'all';
    this.store.difficulty.set(filter);
  }

  protected setActive(route: Route, isActive: boolean): void {
    void this.store.setActive(route, isActive);
  }

  protected remove(route: Route): void {
    void this.store.confirmAndRemove(route);
  }

  protected editLink(route: Route): string[] {
    return ['/routes', route.slug, 'edit'];
  }

  protected number(value: number): string {
    return formatNumber(value);
  }

  protected updated(route: Route): string {
    return formatRelativeTime(route.updatedAt);
  }
}
