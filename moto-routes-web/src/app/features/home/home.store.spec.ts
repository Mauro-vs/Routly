import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HomeStore } from './home.store';
import { HOME_CATEGORIES, HOME_HOSTS, HOME_LOCATIONS, flushHome } from './testing/home.fixtures';

describe('HomeStore', () => {
  let store: HomeStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), HomeStore],
    });
    store = TestBed.inject(HomeStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide los tres carruseles y el total a la vez, y queda listo', async () => {
    const done = store.load();
    expect(store.status()).toBe('loading');

    flushHome(http);
    await done;

    expect(store.status()).toBe('ready');
    expect(store.categories()).toEqual(HOME_CATEGORIES);
    expect(store.hosts()).toEqual(HOME_HOSTS);
    expect(store.locations()).toEqual(HOME_LOCATIONS);
    expect(store.total()).toBe(12);
  });

  it('la foto de portada es la del tipo de carretera con más experiencias', async () => {
    const done = store.load();
    flushHome(http);
    await done;

    expect(store.cover()).toEqual({ url: 'https://example.com/montana.jpg', seed: 'montana-1' });
  });

  it('si algo falla, queda en error con su mensaje, y reintentar vuelve a pedirlo todo', async () => {
    const failed = store.load();
    http.expectOne((req) => req.url === '/api/shop/categories').flush(null, { status: 500, statusText: 'Error' });
    http.match(() => true).forEach((request) => request.flush({ data: [], pagination: { total: 0, page: 1, limit: 1, totalPages: 0 } }));
    await failed;

    expect(store.status()).toBe('error');
    expect(store.error()).toContain('Algo ha fallado');

    const retried = store.load();
    flushHome(http);
    await retried;
    expect(store.status()).toBe('ready');
  });

  it('al destruirse cancela lo que estaba pidiendo, sin quedar en error', async () => {
    const done = store.load();
    const requests = http.match(() => true);

    TestBed.resetTestingModule();
    await done;

    expect(requests.every((request) => request.cancelled)).toBeTrue();
    expect(store.status()).toBe('loading');
  });
});
