import { HttpTestingController, TestRequest } from '@angular/common/http/testing';

import { ShopCategory, ShopExperience, ShopHost, ShopLocation, ShopPage } from '../../../core/api/shop.models';

/** Datos de ejemplo del Shop para los specs, con la forma de /api/shop. */

export function experience(slug: string, overrides: Partial<ShopExperience> = {}): ShopExperience {
  return {
    _id: `id-${slug}`,
    slug,
    title: `Experiencia ${slug}`,
    language: 'es',
    duration: 6,
    minParticipants: 2,
    maxParticipants: 10,
    host: { _id: 'h1', name: 'Pablo Ortega', slug: 'pablo-ortega-1' },
    route: {
      _id: 'r1',
      title: 'Ruta',
      slug: 'ruta-1',
      distance: 180,
      duration: 4,
      difficulty: 'medium',
      category: { _id: 'c1', name: 'Montaña', slug: 'montana-1' },
      startLocation: { _id: 'l1', slug: 'jaca-1', city: 'Jaca', country: 'España' },
      endLocation: { _id: 'l2', slug: 'huesca-2', city: 'Huesca', country: 'España' },
    },
    guideBike: null,
    coverImage: null,
    priceFrom: 89,
    nextDepartureAt: '2026-11-20T08:00:00.000Z',
    ...overrides,
  };
}

export function page(slugs: string[], { total = slugs.length, page = 1, limit = 12 } = {}): ShopPage<ShopExperience> {
  return { data: slugs.map((slug) => experience(slug)), pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export const CATEGORIES: ShopCategory[] = [
  { _id: 'c1', slug: 'montana-1', name: 'Montaña', experienceCount: 6, coverImage: null },
  { _id: 'c2', slug: 'costa-2', name: 'Costa', experienceCount: 3, coverImage: null },
];
export const HOSTS: ShopHost[] = [{ _id: 'h1', slug: 'pablo-ortega-1', name: 'Pablo Ortega', experienceCount: 5, coverImage: null }];
export const LOCATIONS: ShopLocation[] = [
  { _id: 'l1', slug: 'jaca-1', city: 'Jaca', country: 'España', experienceCount: 2, coverImage: null },
];

/** Las peticiones abiertas al listado del Shop. */
export const experienceRequests = (http: HttpTestingController): TestRequest[] =>
  http.match((req) => req.url === '/api/shop/experiences');

/** Responde los tres listados de opciones de los filtros. */
export function flushFacets(http: HttpTestingController): void {
  http.expectOne((req) => req.url === '/api/shop/categories').flush({ data: CATEGORIES });
  http.expectOne((req) => req.url === '/api/shop/hosts').flush({ data: HOSTS });
  http.expectOne((req) => req.url === '/api/shop/locations').flush({ data: LOCATIONS });
}
