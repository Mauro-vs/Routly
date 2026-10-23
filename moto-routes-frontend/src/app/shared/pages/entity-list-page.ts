import { Directive, OnInit, computed } from '@angular/core';

import { BaseRecord } from '../../core/models/entity.model';
import { EntityStore, StatusFilter } from '../../core/services/entity.store';
import { StatusCounts } from '../components/list-page/list-page.component';
import { createPager } from '../utils/pager';

/**
 * Base de los listados de las colecciones. Carga el listado (y la papelera, para su
 * contador), pagina lo que deja el filtro por estado y reparte las acciones de cada
 * fila al store. Cada página declara su `store`, sus columnas y sus celdas.
 */
@Directive()
export abstract class EntityListPage<T extends BaseRecord> implements OnInit {
  protected abstract readonly store: EntityStore<T, unknown>;

  protected readonly pager = createPager(
    () => this.store.visible(),
    () => this.store.status(),
  );
  protected readonly counts = computed<StatusCounts>(() => ({
    all: this.store.total(),
    active: this.store.activeCount(),
    inactive: this.store.inactiveCount(),
  }));
  /** Primera carga en curso: se pintan los skeletons. Las recargas no los muestran. */
  protected readonly showSkeleton = computed(() => this.store.loading() && !this.store.loaded());
  protected readonly loadFailed = computed(
    () => !this.store.loaded() && !this.store.loading() && this.store.error() !== null,
  );

  protected readonly rowKey = (row: T): string => row._id;
  protected readonly isInactive = (row: T): boolean => !row.isActive;

  ngOnInit(): void {
    void this.store.load();
    // Para el contador del acceso a la papelera.
    void this.store.loadDeleted();
  }

  protected reload(): void {
    void this.store.load();
  }

  protected setStatus(status: StatusFilter): void {
    this.store.setStatus(status);
  }

  protected setActive(row: T, isActive: boolean): void {
    void this.store.setActive(row, isActive);
  }

  protected remove(row: T): void {
    void this.store.confirmAndRemove(row);
  }

  protected name(row: T): string {
    return this.store.displayName(row);
  }
}
