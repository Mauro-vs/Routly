import { HttpTestingController } from '@angular/common/http/testing';

import { ShopCategory, ShopExperience, ShopHost, ShopLocation } from '../../../core/api/shop.models';

/** Datos de ejemplo del Home para los specs, con la forma de /api/shop. */

export const HOME_CATEGORIES: ShopCategory[] = [
  { _id: 'c1', slug: 'montana-1', name: 'Montaña', experienceCount: 6, coverImage: { _id: 'i1', url: 'https://example.com/montana.jpg', alt: 'Montaña' } },
  { _id: 'c2', slug: 'costa-2', name: 'Costa', experienceCount: 3, coverImage: null },
];

export const HOME_HOSTS: ShopHost[] = [
  { _id: 'h1', slug: 'pablo-ortega-1', name: 'Pablo Ortega', experienceCount: 5, coverImage: null, biography: 'Guía en el Pirineo.' },
];

export const HOME_LOCATIONS: ShopLocation[] = [
  { _id: 'l1', slug: 'jaca-1', city: 'Jaca', region: 'Aragón', country: 'España', experienceCount: 2, coverImage: null },
];

/** Responde las cinco peticiones del Home (o las que se le den). */
export function flushHome(
  http: HttpTestingController,
  {
    categories = HOME_CATEGORIES,
    hosts = HOME_HOSTS,
    locations = HOME_LOCATIONS,
    total = 12,
    upcoming = [] as ShopExperience[],
  } = {},
): void {
  http.expectOne((req) => req.url === '/api/shop/categories').flush({ data: categories });
  http.expectOne((req) => req.url === '/api/shop/hosts').flush({ data: hosts });
  http.expectOne((req) => req.url === '/api/shop/locations').flush({ data: locations });
  // El total (una página de uno) y el tablón de próximas salidas
  http
    .expectOne((req) => req.url === '/api/shop/experiences' && !req.params.has('hasDepartures'))
    .flush({ data: [], pagination: { total, page: 1, limit: 1, totalPages: total } });
  http
    .expectOne((req) => req.url === '/api/shop/experiences' && req.params.has('hasDepartures'))
    .flush({ data: upcoming, pagination: { total: upcoming.length, page: 1, limit: 5, totalPages: 1 } });
}
