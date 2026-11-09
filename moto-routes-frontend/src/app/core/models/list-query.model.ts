/**
 * Lo que un listado del panel pide a la API (`utils/listQuery.js` en moto-routes-api):
 *
 *   GET /api/routes?q=pirineo&status=active&sort=-distance&page=2&limit=12&difficulty=hard
 *
 * Todo es opcional menos la página y su tamaño: el panel siempre pide una página.
 */
export interface ListQuery {
  /** Palabras que se buscan en los textos de la colección (el índice de texto de la API). */
  q?: string;
  /** Sin estado, activos e inactivos. */
  status?: 'active' | 'inactive';
  /** Campos separados por comas, con `-` delante para descendente: `-distance,title`. */
  sort?: string;
  page: number;
  limit: number;
  /** Los filtros propios de cada colección: `{ difficulty: 'hard' }`. */
  filters?: Readonly<Record<string, string>>;
}

/** Una página del listado y cuántos hay en total con esos filtros (`X-Total-Count`). */
export interface ListPage<T> {
  items: T[];
  total: number;
}

/** Los query params de la petición: lo vacío no se envía. */
export function listQueryParams(query: ListQuery): Record<string, string | number> {
  const params: Record<string, string | number> = { page: query.page, limit: query.limit };
  const q = query.q?.trim();
  if (q) params['q'] = q;
  if (query.status) params['status'] = query.status;
  if (query.sort) params['sort'] = query.sort;
  for (const [name, value] of Object.entries(query.filters ?? {})) {
    if (value !== '') params[name] = value;
  }
  return params;
}
