import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ApiError, isAbortError } from './api-error';
import { ShopApiService } from './shop-api.service';

describe('ShopApiService', () => {
  let api: ShopApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ShopApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide /api/shop con los parámetros que tienen valor y devuelve el cuerpo', async () => {
    const result = api.get<{ data: string[] }>('/experiences', {
      category: 'montana-1a2b3c',
      search: '',
      host: undefined,
      page: 2,
    });

    const request = http.expectOne((req) => req.url === '/api/shop/experiences');
    expect(request.request.params.keys().sort()).toEqual(['category', 'page']);
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ data: ['a'] });

    expect(await result).toEqual({ data: ['a'] });
  });

  it('convierte un fallo de la API en un ApiError', async () => {
    const result = api.get('/experiences/no-existe');
    http.expectOne('/api/shop/experiences/no-existe').flush(null, { status: 404, statusText: 'Not Found' });

    const error = await result.catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isNotFound).toBeTrue();
  });

  it('al abortar cancela la petición y rechaza con un AbortError', async () => {
    const controller = new AbortController();
    const result = api.get('/experiences', {}, controller.signal);
    const request = http.expectOne('/api/shop/experiences');

    controller.abort();

    expect(request.cancelled).toBeTrue();
    expect(isAbortError(await result.catch((reason: unknown) => reason))).toBeTrue();
  });

  it('con una señal ya abortada no llega a pedir nada', async () => {
    const controller = new AbortController();
    controller.abort();

    const error = await api.get('/experiences', {}, controller.signal).catch((reason: unknown) => reason);

    http.expectNone('/api/shop/experiences');
    expect(isAbortError(error)).toBeTrue();
  });
});
