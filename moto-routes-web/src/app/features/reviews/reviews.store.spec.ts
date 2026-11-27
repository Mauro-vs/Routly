import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, convertToParamMap, provideRouter } from '@angular/router';

import { DEFAULT_REVIEWS_QUERY, ReviewsStore, parseReviewsQuery, toReviewsApiParams, toReviewsUrl } from './reviews.store';
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

describe('ReviewsStore: el resumen IA', () => {
  let store: ReviewsStore;
  let http: HttpTestingController;
  const AI = '/ai/experiences/calas-1/reviews-summary';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting(), ReviewsStore],
    });
    store = TestBed.inject(ReviewsStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function loadWith(total: number): Promise<void> {
    const done = store.load('experience', 'calas-1', DEFAULT_REVIEWS_QUERY);
    http.match((request) => request.url === BASE).forEach((request) => request.flush(page([review('a')], { total })));
    await done;
  }

  it('con 3 opiniones o más lo pide una vez por objetivo', async () => {
    await loadWith(12);
    const first = store.loadAiSummary();
    expect(store.aiLoading()).toBeTrue();
    void store.loadAiSummary();
    http.expectOne(AI).flush({ data: { summary: 'Gustan las calas', pros: [], cons: [], topics: [], basedOn: 12 } });
    await first;

    expect(store.aiLoading()).toBeFalse();
    expect(store.aiSummary()?.summary).toBe('Gustan las calas');
  });

  it('con menos de 3 ni se pide', async () => {
    await loadWith(2);
    await store.loadAiSummary();
    http.expectNone(AI);
    expect(store.aiSummary()).toBeNull();
  });

  it('si la IA no está (503), no hay resumen', async () => {
    await loadWith(5);
    const done = store.loadAiSummary();
    http.expectOne(AI).flush(null, { status: 503, statusText: 'Service Unavailable' });
    await done;
    expect(store.aiSummary()).toBeNull();
    expect(store.aiLoading()).toBeFalse();
  });
});

describe('las opiniones en la URL', () => {
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
