import { Directive, OnInit, computed, signal } from '@angular/core';

import { BaseRecord } from '../../core/models/entity.model';
import { EntityStore } from '../../core/services/entity.store';
import { RestoreAs } from '../components/trash-page/trash-page.component';
import { formatRelativeTime } from '../utils/format';

/**
 * Base de las papeleras: pide los registros eliminados y los restaura como estaban,
 * activos o inactivos. Cada página declara su `store`, sus columnas y, si una
 * referencia puede impedir restaurar, `blockedReason`.
 */
@Directive()
export abstract class EntityTrashPage<T extends BaseRecord> implements OnInit {
  protected abstract readonly store: EntityStore<T, unknown>;

  /** Cómo vuelve un registro al restaurarlo. Por defecto, como estaba al eliminarlo. */
  protected readonly restoreAs = signal<RestoreAs>('previous');

  protected readonly showSkeleton = computed(
    () => this.store.deletedLoading() && !this.store.deletedLoaded(),
  );
  protected readonly loadFailed = computed(
    () =>
      !this.store.deletedLoaded() &&
      !this.store.deletedLoading() &&
      this.store.deletedError() !== null,
  );

  protected readonly rowKey = (row: T): string => row._id;

  ngOnInit(): void {
    void this.store.loadDeleted();
  }

  protected reload(): void {
    void this.store.loadDeleted();
  }

  protected restore(row: T): void {
    const restoreAs = this.restoreAs();
    // Sin isActive, la API lo devuelve con el estado que tenía
    const isActive = restoreAs === 'previous' ? undefined : restoreAs === 'active';
    void this.store.restoreAndNotify(row, isActive);
  }

  /**
   * Por qué no se puede restaurar todavía: una referencia (la categoría de una ruta,
   * por ejemplo) sigue en la papelera y la API respondería 409. null: se puede.
   */
  protected blockedReason(_row: T): string | null {
    return null;
  }

  protected name(row: T): string {
    return this.store.displayName(row);
  }

  /** "hace 2 h": cuándo se eliminó. */
  protected deletedAgo(row: T): string {
    return row.deletedAt ? formatRelativeTime(row.deletedAt) : '';
  }
}
