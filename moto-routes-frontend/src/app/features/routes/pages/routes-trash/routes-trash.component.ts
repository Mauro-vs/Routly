import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DIFFICULTY_BADGES, DIFFICULTY_LABELS, Route } from '../../../../core/models/route.model';
import {
  DataTableComponent,
  TableCellDirective,
  TableColumn,
} from '../../../../shared/components/data-table/data-table.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SearchInputComponent } from '../../../../shared/components/search-input/search-input.component';
import {
  SegmentOption,
  SegmentedComponent,
} from '../../../../shared/components/segmented/segmented.component';
import { formatRelativeTime } from '../../../../shared/utils/format';
import { matchesQuery } from '../../../../shared/utils/text';
import { RoutesStore } from '../../services/routes.store';

type RestoreAs = 'inactive' | 'active';

const COLUMNS: readonly TableColumn[] = [
  { key: 'title', header: 'Ruta' },
  { key: 'trip', header: 'Recorrido', wide: true, plain: true },
  { key: 'difficulty', header: 'Dificultad', plain: true },
  { key: 'deleted', header: 'Eliminada' },
  { key: 'actions', header: 'Acciones', headerHidden: true, align: 'end', wide: true },
];

/**
 * Papelera: las rutas eliminadas, que siguen en la base de datos (borrado lógico) y
 * se pueden restaurar cuando se quiera, activas o inactivas.
 */
@Component({
  selector: 'app-routes-trash',
  imports: [
    RouterLink,
    DataTableComponent,
    TableCellDirective,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    SearchInputComponent,
    SegmentedComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './routes-trash.component.html',
  styleUrl: './routes-trash.component.css',
})
export class RoutesTrashComponent {
  protected readonly store = inject(RoutesStore);

  protected readonly columns = COLUMNS;
  protected readonly difficultyLabels = DIFFICULTY_LABELS;
  protected readonly difficultyBadges = DIFFICULTY_BADGES;
  protected readonly restoreOptions: SegmentOption<RestoreAs>[] = [
    { value: 'inactive', label: 'Inactiva' },
    { value: 'active', label: 'Activa' },
  ];

  protected readonly search = signal('');
  /** Cómo vuelve una ruta al restaurarla. Inactiva por defecto: revisarla antes de publicarla. */
  protected readonly restoreAs = signal<RestoreAs>('inactive');

  protected readonly showSkeleton = computed(
    () => this.store.deletedLoading() && !this.store.deletedLoaded(),
  );
  protected readonly loadFailed = computed(
    () =>
      !this.store.deletedLoaded() &&
      !this.store.deletedLoading() &&
      this.store.deletedError() !== null,
  );

  protected readonly filtered = computed(() => {
    const search = this.search().trim();
    const deleted = this.store.deleted();
    return search
      ? deleted.filter((route) =>
          matchesQuery(`${route.title} ${route.startPoint} ${route.endPoint}`, search),
        )
      : deleted;
  });

  protected readonly subtitle = computed(() => {
    if (!this.store.deletedLoaded()) return 'Cargando la papelera…';
    const count = this.store.deletedCount();
    if (count === 0) return 'Aquí aparecen las rutas que eliminas.';
    return count === 1
      ? '1 ruta eliminada. Puedes restaurarla cuando quieras.'
      : `${count} rutas eliminadas. Puedes restaurarlas cuando quieras.`;
  });

  protected readonly rowKey = (route: Route): string => route._id;

  constructor() {
    void this.store.loadDeleted();
  }

  protected reload(): void {
    void this.store.loadDeleted();
  }

  protected restore(route: Route): void {
    void this.store.restoreAndNotify(route, this.restoreAs() === 'active');
  }

  protected deletedAgo(route: Route): string {
    return route.deletedAt ? formatRelativeTime(route.deletedAt) : '';
  }
}
