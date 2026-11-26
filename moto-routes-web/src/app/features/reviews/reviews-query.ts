import { ParamMap } from '@angular/router';

import { ShopParams } from '../../core/api/shop-api.service';

/*
 * Lo que se ve de las opiniones va en la URL, en español, como el Shop:
 * ?opiniones=recientes|mejores|peores&estrellas=1..5&con-fotos=si&
 * Lo que no vale se ignora. "Ver más" no va en la URL: la página siguiente se añade a la lista.
 */

export const REVIEW_URL_PARAMS = { sort: 'opiniones', stars: 'estrellas', withPhotos: 'con-fotos' } as const;

export type ReviewSort = 'recientes' | 'mejores' | 'peores';

export const REVIEW_SORTS: Record<ReviewSort, { label: string; api: string }> = {
  recientes: { label: 'Más recientes', api: 'recent' },
  mejores: { label: 'Mejor valoradas', api: 'best' },
  peores: { label: 'Peor valoradas', api: 'worst' },
};

export interface ReviewsQuery {
  sort: ReviewSort;
  /** Solo las de esas estrellas, o null */
  stars: number | null;
  withPhotos: boolean;
}

export const DEFAULT_REVIEWS_QUERY: ReviewsQuery = { sort: 'recientes', stars: null, withPhotos: false };

/** Cuántas opiniones por página ("Ver más" pide las siguientes) */
export const REVIEWS_PAGE_SIZE = 10;

export function parseReviewsQuery(params: ParamMap): ReviewsQuery {
  const sort = params.get(REVIEW_URL_PARAMS.sort);
  const stars = Number(params.get(REVIEW_URL_PARAMS.stars));
  return {
    sort: sort !== null && sort in REVIEW_SORTS ? (sort as ReviewSort) : 'recientes',
    stars: Number.isInteger(stars) && stars >= 1 && stars <= 5 ? stars : null,
    withPhotos: params.get(REVIEW_URL_PARAMS.withPhotos) === 'si',
  };
}

/** La query de la URL, para escribirla: lo que está por defecto no se escribe. */
export function toReviewsUrl(query: ReviewsQuery): Record<string, string | null> {
  return {
    [REVIEW_URL_PARAMS.sort]: query.sort === 'recientes' ? null : query.sort,
    [REVIEW_URL_PARAMS.stars]: query.stars === null ? null : String(query.stars),
    [REVIEW_URL_PARAMS.withPhotos]: query.withPhotos ? 'si' : null,
  };
}

/** Los parámetros de /api/shop/.../reviews de una página. */
export function toReviewsApiParams(query: ReviewsQuery, page: number): ShopParams {
  return {
    sort: REVIEW_SORTS[query.sort].api,
    rating: query.stars,
    withPhotos: query.withPhotos ? true : null,
    page,
    limit: REVIEWS_PAGE_SIZE,
  };
}

export const sameReviewsQuery = (a: ReviewsQuery, b: ReviewsQuery): boolean =>
  a.sort === b.sort && a.stars === b.stars && a.withPhotos === b.withPhotos;
