import { ParamMap } from '@angular/router';

import { ShopParams } from '../../core/api/shop-api.service';
import { Difficulty } from '../../core/api/shop.models';

/*
 * La URL del Shop es la fuente de verdad: filtros, búsqueda, orden y página van en ella, en
 * español (/experiencias?categoria=&anfitrion=&ubicacion=&buscar=&dificultad=&con-fechas=&orden=
 * &pagina=). Aquí se traduce a un ShopQuery y de él a los parámetros de /api/shop.
 * Lo que no vale en la URL (una página que no es un número, una dificultad que no existe...) se
 * ignora: la página se enseña como si no estuviera.
 */

/** Los parámetros de la URL, por si hay que escribirlos o quitarlos */
export const URL_PARAMS = {
  category: 'categoria',
  host: 'anfitrion',
  location: 'ubicacion',
  search: 'buscar',
  difficulty: 'dificultad',
  withDates: 'con-fechas',
  sort: 'orden',
  page: 'pagina',
} as const;

export type SortKey = 'proximas' | 'precio' | 'precio-desc' | 'titulo';

/** Cada orden de la URL y su campo de la API. Sin orden: novedades, o relevancia si se busca */
export const SORTS: Record<SortKey, { label: string; api: string }> = {
  proximas: { label: 'Próxima salida', api: 'nextDepartureAt' },
  precio: { label: 'Más baratas', api: 'priceFrom' },
  'precio-desc': { label: 'Más caras', api: '-priceFrom' },
  titulo: { label: 'Por nombre', api: 'title' },
};

/** La dificultad en la URL (en español) y en la API */
export const DIFFICULTIES: Record<string, { label: string; api: Difficulty }> = {
  facil: { label: 'Fácil', api: 'easy' },
  media: { label: 'Media', api: 'medium' },
  dificil: { label: 'Difícil', api: 'hard' },
};

export interface ShopQuery {
  category: string | null;
  host: string | null;
  location: string | null;
  search: string;
  /** La de la URL: facil, media o dificil */
  difficulty: string | null;
  withDates: boolean;
  sort: SortKey | null;
  page: number;
}

export const EMPTY_QUERY: ShopQuery = {
  category: null,
  host: null,
  location: null,
  search: '',
  difficulty: null,
  withDates: false,
  sort: null,
  page: 1,
};

/** Cuántas experiencias por página */
export const PAGE_SIZE = 12;

// El formato de los slugs de la API: con otro, la API respondería 400
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slug = (value: string | null): string | null => (value && SLUG.test(value) ? value : null);

export function parseShopQuery(params: ParamMap): ShopQuery {
  const page = Number(params.get(URL_PARAMS.page));
  const difficulty = params.get(URL_PARAMS.difficulty);
  const sort = params.get(URL_PARAMS.sort);
  return {
    category: slug(params.get(URL_PARAMS.category)),
    host: slug(params.get(URL_PARAMS.host)),
    location: slug(params.get(URL_PARAMS.location)),
    search: (params.get(URL_PARAMS.search) ?? '').trim().slice(0, 100),
    difficulty: difficulty && difficulty in DIFFICULTIES ? difficulty : null,
    withDates: params.get(URL_PARAMS.withDates) === 'si',
    sort: sort && sort in SORTS ? (sort as SortKey) : null,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** Los parámetros de GET /api/shop/experiences */
export interface ShopApiParams extends ShopParams {
  category?: string;
  host?: string;
  location?: string;
  search?: string;
  difficulty?: Difficulty;
  hasDepartures?: true;
  sort?: string;
  page: number;
  limit: number;
}

export function toApiParams(query: ShopQuery): ShopApiParams {
  const params: ShopApiParams = { page: query.page, limit: PAGE_SIZE };
  if (query.category) params.category = query.category;
  if (query.host) params.host = query.host;
  if (query.location) params.location = query.location;
  if (query.search) params.search = query.search;
  if (query.difficulty) params.difficulty = DIFFICULTIES[query.difficulty].api;
  if (query.withDates) params.hasDepartures = true;
  // Buscando y sin orden pedido, la API ordena por relevancia; si no, novedades
  if (query.sort) params.sort = SORTS[query.sort].api;
  else if (!query.search) params.sort = '-createdAt';
  return params;
}
