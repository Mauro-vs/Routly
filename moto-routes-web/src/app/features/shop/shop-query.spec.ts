import { convertToParamMap } from '@angular/router';

import { EMPTY_QUERY, parseShopQuery, toApiParams } from './shop-query';

const parse = (params: Record<string, string>) => parseShopQuery(convertToParamMap(params));

describe('shop-query', () => {
  it('sin parámetros, la primera página de todo, por novedades', () => {
    expect(parse({})).toEqual(EMPTY_QUERY);
    expect(toApiParams(EMPTY_QUERY)).toEqual({ page: 1, limit: 12, sort: '-createdAt' });
  });

  it('traduce la URL en español a los parámetros de /api/shop', () => {
    const query = parse({
      categoria: 'montana-1a2b',
      anfitrion: 'pablo-ortega-3c4d',
      ubicacion: 'jaca-5e6f',
      buscar: ' costa ',
      dificultad: 'media',
      'con-fechas': 'si',
      orden: 'precio',
      pagina: '3',
    });

    expect(toApiParams(query)).toEqual({
      category: 'montana-1a2b',
      host: 'pablo-ortega-3c4d',
      location: 'jaca-5e6f',
      search: 'costa',
      difficulty: 'medium',
      hasDepartures: true,
      sort: 'priceFrom',
      page: 3,
      limit: 12,
    });
  });

  it('cada orden tiene su campo; buscando sin orden, por relevancia (sin sort)', () => {
    expect(toApiParams(parse({ orden: 'proximas' })).sort).toBe('nextDepartureAt');
    expect(toApiParams(parse({ orden: 'precio-desc' })).sort).toBe('-priceFrom');
    expect(toApiParams(parse({ orden: 'titulo' })).sort).toBe('title');
    expect(toApiParams(parse({ buscar: 'costa' })).sort).toBeUndefined();
  });

  it('lo que no vale en la URL se ignora: página, dificultad, orden y slugs mal formados', () => {
    expect(parse({ pagina: 'abc' }).page).toBe(1);
    expect(parse({ pagina: '-2' }).page).toBe(1);
    expect(parse({ dificultad: 'extrema' }).difficulty).toBeNull();
    expect(parse({ orden: 'al-azar' }).sort).toBeNull();
    expect(parse({ categoria: 'No Vale' }).category).toBeNull();
    expect(parse({ 'con-fechas': 'quizas' }).withDates).toBeFalse();
  });

  it('el precio del slider: precioMin y precioMax llegan a la API como priceMin y priceMax', () => {
    expect(toApiParams(parse({ precioMin: '40', precioMax: '200' }))).toEqual(
      jasmine.objectContaining({ priceMin: 40, priceMax: 200 }),
    );
    const onlyMax = toApiParams(parse({ precioMax: '150' }));
    expect(onlyMax.priceMax).toBe(150);
    expect(onlyMax.priceMin).toBeUndefined();
  });

  it('un precio que no vale, en un extremo o cruzado se ignora', () => {
    expect(parse({ precioMin: 'barato' }).priceMin).toBeNull();
    expect(parse({ precioMin: '12.5' }).priceMin).toBeNull();
    // 0 y 400 son los extremos del slider: sin límite
    expect(parse({ precioMin: '0', precioMax: '400' })).toEqual(jasmine.objectContaining({ priceMin: null, priceMax: null }));
    // Cruzado, la API respondería 400: fuera los dos
    expect(parse({ precioMin: '300', precioMax: '100' })).toEqual(jasmine.objectContaining({ priceMin: null, priceMax: null }));
  });
});
