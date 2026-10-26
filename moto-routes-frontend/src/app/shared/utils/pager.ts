import { Signal, WritableSignal, computed, linkedSignal } from '@angular/core';

/** Registros por página en los listados. */
const PAGE_SIZE = 12;

interface Pager<T> {
  /** Página actual, empezando en 1. Se enlaza con `ui-pagination`. */
  page: WritableSignal<number>;
  /** Los registros de la página actual. */
  items: Signal<T[]>;
  /** Cuántos registros hay en total (en todas las páginas). */
  total: Signal<number>;
  pageSize: number;
}

/**
 * Paginación visual de un listado que ya está entero en memoria. Vuelve a la página 1
 * cuando cambia `resetKey` (por ejemplo, el filtro por estado) y nunca se queda en
 * una página que ya no existe.
 */
export function createPager<T>(
  rows: () => readonly T[],
  resetKey: () => unknown,
  pageSize = PAGE_SIZE,
): Pager<T> {
  const total = computed(() => rows().length);
  const pageCount = computed(() => Math.max(1, Math.ceil(total() / pageSize)));

  const page = linkedSignal<{ key: unknown; pages: number }, number>({
    source: () => ({ key: resetKey(), pages: pageCount() }),
    computation: (source, previous) =>
      previous && previous.source.key === source.key ? Math.min(previous.value, source.pages) : 1,
  });

  const items = computed(() => {
    const start = (page() - 1) * pageSize;
    return rows().slice(start, start + pageSize);
  });

  return { page, items, total, pageSize };
}
