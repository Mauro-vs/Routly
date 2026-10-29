import { Directive, OnInit, computed, effect, inject, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BaseRecord } from '../../core/models/entity.model';
import { EntityStore, StatusFilter } from '../../core/services/entity.store';
import { StatusCounts } from '../components/list-page/list-page.component';
import { createPager } from '../utils/pager';

/** Parámetros de la URL con el estado del listado: `?estado=inactive&pagina=2`. */
const STATUS_PARAM = 'estado';
const PAGE_PARAM = 'pagina';

function readStatus(value: string | null): StatusFilter | null {
  return value === 'active' || value === 'inactive' || value === 'all' ? value : null;
}

/**
 * Base de los listados de las colecciones. Carga el listado (y la papelera, para su
 * contador), pagina lo que deja el filtro por estado y reparte las acciones de cada
 * fila al store. Cada página declara su `store`, sus columnas y sus celdas.
 *
 * El filtro y la página van en la URL: se pueden enlazar y sobreviven a una recarga.
 * Sin parámetros se usa el filtro que ya tenía el store, así se conserva al volver
 * del detalle.
 */
@Directive()
export abstract class EntityListPage<T extends BaseRecord> implements OnInit {
  protected abstract readonly store: EntityStore<T, unknown>;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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
  /** El error de la carga (o null): las páginas compartidas cuentan con él el motivo. */
  protected readonly loadFailed = computed(
    () => (!this.store.loaded() && !this.store.loading() && this.store.error()) || null,
  );

  protected readonly rowKey = (row: T): string => row._id;
  protected readonly isInactive = (row: T): boolean => !row.isActive;

  constructor() {
    // El estado del listado se refleja en la URL, sin añadir entradas al historial.
    effect(() => {
      const status = this.store.status();
      const page = this.pager.page();
      untracked(() => {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {
            [STATUS_PARAM]: status === 'all' ? null : status,
            [PAGE_PARAM]: page > 1 ? page : null,
          },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });
    });
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const status = readStatus(params.get(STATUS_PARAM));
    if (status) this.store.status.set(status);
    const page = Number(params.get(PAGE_PARAM));

    // La página se aplica cuando hay datos: antes solo existe la primera.
    void this.store.load().then(() => {
      if (Number.isInteger(page) && page > 1) this.pager.page.set(page);
    });
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
