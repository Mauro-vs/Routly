import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { DEFAULT_REVIEWS_QUERY } from './reviews-query';
import { ReviewsStore } from './reviews.store';
import { page, review } from './testing/reviews.fixtures';

const BASE = '/api/shop/experiences/calas-1/reviews';

describe('ReviewsStore', () => {
  let store: ReviewsStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(), ReviewsStore],
    });
    store = TestBed.inject(ReviewsStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // La tira de fotos de los clientes va aparte
  const flushStrip = (reviews = [review('p', { photos: [{ _id: 'f1', url: '/api/uploads/reviews/a.webp', width: 10, height: 10, createdAt: '' }] })]) =>
    http.expectOne((request) => request.url === BASE && request.params.get('withPhotos') === 'true' && !request.params.has('page')).flush(page(reviews));
  const list = (pageNumber: number) =>
    http.expectOne((request) => request.url === BASE && request.params.get('page') === String(pageNumber));

  it('pide la primera página, el resumen y las fotos de los clientes', async () => {
    const done = store.load('experience', 'calas-1', DEFAULT_REVIEWS_QUERY);
    expect(store.status()).toBe('loading');
    flushStrip();
    const request = list(1);
    expect(request.request.params.get('sort')).toBe('recent');
    request.flush(page([review('a'), review('b')], { totalPages: 2, total: 12, withPhotos: 1 }));
    await done;

    expect(store.status()).toBe('ready');
    expect(store.reviews().map((item) => item._id)).toEqual(['a', 'b']);
    expect(store.summary()?.count).toBe(12);
    expect(store.hasMore()).toBeTrue();
    expect(store.photos().map((photo) => photo.author)).toEqual(['Rider p']);
  });

  it('"Ver más" añade la página siguiente debajo', async () => {
    const first = store.load('experience', 'calas-1', DEFAULT_REVIEWS_QUERY);
    flushStrip();
    list(1).flush(page([review('a')], { totalPages: 2, total: 2 }));
    await first;

    const more = store.loadMore();
    expect(store.loadingMore()).toBeTrue();
    list(2).flush(page([review('b')], { page: 2, totalPages: 2, total: 2 }));
    await more;

    expect(store.reviews().map((item) => item._id)).toEqual(['a', 'b']);
    expect(store.hasMore()).toBeFalse();
    expect(store.loadingMore()).toBeFalse();
  });

  it('al cambiar el filtro, la respuesta vieja no pisa la nueva', async () => {
    void store.load('experience', 'calas-1', DEFAULT_REVIEWS_QUERY);
    flushStrip();
    const old = list(1);
    const done = store.load('experience', 'calas-1', { ...DEFAULT_REVIEWS_QUERY, stars: 5 });
    expect(old.cancelled).toBeTrue();
    const fresh = http.expectOne((request) => request.url === BASE && request.params.get('rating') === '5');
    fresh.flush(page([review('cinco')]));
    await done;
    expect(store.reviews().map((item) => item._id)).toEqual(['cinco']);
  });

  it('pulsar una barra filtra por sus estrellas y otra vez lo quita, en la URL', async () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    store.toggleStars(4);
    expect(navigate.calls.mostRecent().args[1]?.queryParams).toEqual({ opiniones: null, estrellas: '4', 'con-fotos': null });
    store.query.set({ ...DEFAULT_REVIEWS_QUERY, stars: 4 });
    store.toggleStars(4);
    expect(navigate.calls.mostRecent().args[1]?.queryParams).toEqual({ opiniones: null, estrellas: null, 'con-fotos': null });
  });

  it('mi opinión se enseña aparte: no se repite en la lista', async () => {
    const done = store.load('experience', 'calas-1', DEFAULT_REVIEWS_QUERY);
    flushStrip([]);
    list(1).flush(page([review('mia'), review('otra')]));
    await done;

    const mine = store.loadMine();
    http.expectOne(`${BASE}/mine`).flush({ data: { review: review('mia'), canReview: false, reason: 'REVIEW_ALREADY_EXISTS' } });
    await mine;
    expect(store.others().map((item) => item._id)).toEqual(['otra']);
  });

  it('sin sesión (401), "la mía" se queda en null', async () => {
    const done = store.load('experience', 'calas-1', DEFAULT_REVIEWS_QUERY);
    flushStrip([]);
    list(1).flush(page([]));
    await done;

    const mine = store.loadMine();
    http.expectOne(`${BASE}/mine`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await mine;
    expect(store.mine()).toBeNull();
  });
});
