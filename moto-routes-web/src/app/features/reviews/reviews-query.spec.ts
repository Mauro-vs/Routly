import { convertToParamMap } from '@angular/router';

import { DEFAULT_REVIEWS_QUERY, parseReviewsQuery, toReviewsApiParams, toReviewsUrl } from './reviews-query';

describe('reviews-query', () => {
  const parse = (params: Record<string, string>) => parseReviewsQuery(convertToParamMap(params));

  it('sin nada en la URL: las más recientes, sin filtros', () => {
    expect(parse({})).toEqual(DEFAULT_REVIEWS_QUERY);
    expect(toReviewsApiParams(DEFAULT_REVIEWS_QUERY, 1)).toEqual({ sort: 'recent', rating: null, withPhotos: null, page: 1, limit: 10 });
  });

  it('el orden, las estrellas y "con fotos" van en español en la URL y en inglés a la API', () => {
    const query = parse({ opiniones: 'peores', estrellas: '2', 'con-fotos': 'si' });
    expect(query).toEqual({ sort: 'peores', stars: 2, withPhotos: true });
    expect(toReviewsApiParams(query, 3)).toEqual({ sort: 'worst', rating: 2, withPhotos: true, page: 3, limit: 10 });
    expect(toReviewsUrl(query)).toEqual({ opiniones: 'peores', estrellas: '2', 'con-fotos': 'si' });
  });

  it('lo que no vale se ignora, y lo que está por defecto no se escribe', () => {
    expect(parse({ opiniones: 'al-azar', estrellas: '7', 'con-fotos': 'quizas' })).toEqual(DEFAULT_REVIEWS_QUERY);
    expect(parse({ estrellas: '2.5' }).stars).toBeNull();
    expect(toReviewsUrl(DEFAULT_REVIEWS_QUERY)).toEqual({ opiniones: null, estrellas: null, 'con-fotos': null });
  });
});
