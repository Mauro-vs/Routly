import { Directive, OnInit, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BaseRecord } from '../../core/models/entity.model';
import { ListQuery } from '../../core/models/list-query.model';
import { EntityStore, StatusFilter } from '../../core/services/entity.store';
import { StatusCounts } from '../components/list-page/list-page.component';
import { ListSort } from '../utils/search';

/** Parámetros de la URL con el estado del listado: `?estado=inactive&pagina=2`. */
const STATUS_PARAM = 'estado';
const PAGE_PARAM = 'pagina';
const QUERY_PARAM = 'q';
const SORT_PARAM = 'orden';

/** Registros por página. */
const PAGE_SIZE = 12;
/** Lo que se espera a que se deje de escribir antes de buscar. */
const SEARCH_DELAY = 300;

function readStatus(value: string | null): StatusFilter | null {
  return value === 'active' || value === 'inactive' || value === 'all' ? value : null;
}

/**
 * Base de los listados de las colecciones. Cada página del listado se la pide a la API con
 * sus query params (`?q=&status=&sort=&page=&limit=`): la búsqueda, el filtro por estado, el
 * orden y la paginación los hace el servidor. Las acciones de cada fila van al store. Cada
 * página declara su `store`, sus columnas, sus celdas y sus órdenes (`sorts`).
 *
 * La búsqueda, el orden, el filtro y la página van en la URL: se pueden enlazar y sobreviven
 * a una recarga. Sin parámetros se usa el filtro que ya tenía el store, así se conserva al
 * volver del detalle.
 */
@Directive()
export abstract class EntityListPage<T extends BaseRecord> implements OnInit {
  protected abstract readonly store: EntityStore<T, unknown>;

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Lo que se escribe en el buscador. */
  protected readonly query = signal('');
  /** Lo que se busca: el texto del buscador cuando se deja de escribir. */
  private readonly searchTerm = signal('');
  /**
   * Las formas de ordenar, con el `sort` de la API. La primera es la de por defecto. Por
   * defecto, las más recientes y por nombre (`nameSort`).
   */
  protected readonly sorts: readonly ListSort[] = [
    { value: 'recientes', label: 'Más recientes', sort: '-createdAt' },
    { value: 'nombre', label: 'Nombre (A-Z)', sort: this.nameSort() },
  ];
  protected readonly sort = signal('');
  protected readonly pageSize = PAGE_SIZE;
  /** La página, desde 1. Vuelve a la primera al cambiar el filtro, la búsqueda o el orden. */
  protected readonly page = linkedSignal<string, number>({
    source: () => [this.store.status(), this.searchTerm(), this.sort(), JSON.stringify(this.filters())].join('|'),
    computation: (key, previous) => (previous && previous.source === key ? previous.value : 1),
  });

  /** La página que se ve, tal como la devuelve la API. */
  protected readonly rows = computed(() => this.store.page());

  protected readonly counts = computed<StatusCounts>(() => ({
    all: this.store.total(),
    active: this.store.activeCount(),
    inactive: this.store.inactiveCount(),
  }));
  /** Ya hay datos para juzgar si el listado está vacío. */
  protected readonly listLoaded = computed(() => this.store.loaded() && this.store.pageLoaded());
  /** Primera carga en curso: se pintan los skeletons. Las recargas no los muestran. */
  protected readonly showSkeleton = computed(() => !this.store.pageLoaded() && !this.store.pageError());
  /** El error de la carga (o null): las páginas compartidas cuentan con él el motivo. */
  protected readonly loadFailed = computed(() => {
    const pageFailed = !this.store.pageLoaded() && !this.store.pageLoading() && this.store.pageError();
    const listFailed = !this.store.loaded() && !this.store.loading() && this.store.error();
    return pageFailed || listFailed || null;
  });

  protected readonly rowKey = (row: T): string => row._id;
  protected readonly isInactive = (row: T): boolean => !row.isActive;

  /** Lo que se le pide a la API. */
  private readonly listQuery = computed<ListQuery>(() => {
    const status = this.store.status();
    return {
      q: this.searchTerm() || undefined,
      status: status === 'all' ? undefined : status,
      sort: this.sorts.find((option) => option.value === this.sort())?.sort,
      page: this.page(),
      limit: PAGE_SIZE,
      filters: this.filters(),
    };
  });
  /** Hasta leer la URL no se pide nada: la primera petición ya lleva sus parámetros. */
  private readonly ready = signal(false);

  constructor() {
    // El buscador espera a que se deje de escribir. Si la petición anterior no ha vuelto,
    // el store la cancela.
    effect((onCleanup) => {
      const text = this.query().trim();
      if (text === untracked(this.searchTerm)) return;
      const timer = setTimeout(() => this.searchTerm.set(text), SEARCH_DELAY);
      onCleanup(() => clearTimeout(timer));
    });

    // Cada cambio de filtro, búsqueda, orden o página pide su página a la API.
    effect(() => {
      if (!this.ready()) return;
      const query = this.listQuery();
      untracked(() => this.store.loadPage(query));
    });

    // Una página que ya no existe (se han borrado registros, o la URL pedía la 9 de 3):
    // se pasa a la última que hay.
    effect(() => {
      if (!this.ready() || !this.store.pageLoaded() || this.store.pageLoading()) return;
      const last = Math.max(1, Math.ceil(this.store.pageTotal() / PAGE_SIZE));
      if (untracked(this.page) > last) this.page.set(last);
    });

    // El estado del listado se refleja en la URL, sin añadir entradas al historial.
    effect(() => {
      if (!this.ready()) return;
      const status = this.store.status();
      const page = this.page();
      const query = this.searchTerm();
      const sort = this.sort();
      untracked(() => {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {
            [STATUS_PARAM]: status === 'all' ? null : status,
            [PAGE_PARAM]: page > 1 ? page : null,
            [QUERY_PARAM]: query || null,
            [SORT_PARAM]: sort && sort !== this.sorts[0]?.value ? sort : null,
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
    const query = (params.get(QUERY_PARAM) ?? '').trim();
    this.query.set(query);
    this.searchTerm.set(query);
    const sort = params.get(SORT_PARAM);
    this.sort.set(this.sorts.some((option) => option.value === sort) ? (sort as string) : (this.sorts[0]?.value ?? ''));
    // La página, después del resto: cambiarlos la devuelve a la 1.
    const page = Number(params.get(PAGE_PARAM));
    if (Number.isInteger(page) && page > 1) {
      this.page();
      this.page.set(page);
    }
    this.ready.set(true);

    // La colección entera, para los contadores del filtro y del menú.
    void this.store.load();
    // Para el contador del acceso a la papelera.
    void this.store.loadDeleted();
  }

  protected reload(): void {
    this.store.reloadPage();
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

  /** El campo de la API para "Nombre (A-Z)". Cada colección dice el suyo: `title`, `city`... */
  protected nameSort(): string {
    return 'name';
  }

  /** Los filtros propios de la página, con los nombres de la API. Por defecto, ninguno. */
  protected filters(): Readonly<Record<string, string>> {
    return {};
  }
}
