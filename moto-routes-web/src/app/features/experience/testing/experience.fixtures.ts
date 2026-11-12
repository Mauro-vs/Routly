import { HttpTestingController } from '@angular/common/http/testing';

import { ShopDeparture, ShopExperienceDetail } from '../../../core/api/shop.models';

/** Datos de ejemplo del detalle para los specs, con la forma de /api/shop. */

export const DETAIL: ShopExperienceDetail = {
  _id: 'e1',
  slug: 'calas-de-mallorca-1',
  title: 'Calas de Mallorca en moto',
  description: 'Calas escondidas del sur de la isla, con parada para bañarse.',
  meetingPoint: "Plaça d'Espanya, Palma",
  language: 'es',
  duration: 4,
  minParticipants: 2,
  maxParticipants: 6,
  host: {
    _id: 'h1',
    slug: 'lucia-ferrer-1',
    name: 'Lucía Ferrer',
    biography: 'Guía en Mallorca desde 2015.',
    experienceCount: 3,
    coverImage: null,
  },
  route: {
    _id: 'r1',
    title: 'Caminos de Mallorca',
    slug: 'caminos-1',
    distance: 120,
    duration: 3,
    difficulty: 'medium',
    category: { _id: 'c1', name: 'Costa', slug: 'costa-1' },
    startLocation: { _id: 'l1', slug: 'palma-1', city: 'Palma', country: 'España' },
    endLocation: { _id: 'l2', slug: 'soller-2', city: 'Sóller', country: 'España' },
  },
  guideBike: { _id: 'b1', brand: 'BMW', model: 'R 1250 GS', version: 'Adventure', license: 'A' },
  coverImage: null,
  priceFrom: 75,
  nextDepartureAt: '2026-12-22T08:00:00.000Z',
  images: [],
};

export function departure(slug: string, overrides: Partial<ShopDeparture> = {}): ShopDeparture {
  return {
    _id: `id-${slug}`,
    slug,
    sku: 'RTL-DEP-261112-AAAAA',
    startAt: '2026-12-22T08:00:00.000Z',
    endAt: '2026-12-22T12:00:00.000Z',
    capacity: 6,
    price: 75,
    state: 'scheduled',
    seatsBooked: 0,
    seatsLeft: 6,
    isFull: false,
    ...overrides,
  };
}

export const DEPARTURES: ShopDeparture[] = [
  departure('salida-llena', { startAt: '2026-11-17T08:00:00.000Z', endAt: '2026-11-17T12:00:00.000Z', price: 70, seatsBooked: 6, seatsLeft: 0, isFull: true }),
  departure('salida-libre'),
];

/** Responde el detalle y sus salidas. */
export function flushDetail(http: HttpTestingController, { detail = DETAIL, departures = DEPARTURES } = {}): void {
  http.expectOne(`/api/shop/experiences/${detail.slug}`).flush({ data: detail });
  http.expectOne(`/api/shop/experiences/${detail.slug}/departures`).flush({ data: departures });
}
