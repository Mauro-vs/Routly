import { HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { errorInterceptor } from '../interceptors/error.interceptor';
import { REQUEST_TIMEOUT, timeoutInterceptor } from '../interceptors/timeout.interceptor';
import { ApiError } from '../models/api-error.model';
import { ApiStatusService } from './api-status.service';
import { ApiService } from './api.service';

const BASE = environment.apiUrl;

/** Espera a que una promesa falle y devuelve el motivo. */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('La promesa no ha fallado');
}

describe('ApiService con sus interceptores', () => {
  let api: ApiService;
  let http: HttpTestingController;
  let status: ApiStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([errorInterceptor, timeoutInterceptor, authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
    status = TestBed.inject(ApiStatusService);
  });

  afterEach(() => http.verify());

  it('antepone la URL base y devuelve el cuerpo en una promesa', async () => {
    const promise = api.get<{ ok: boolean }>('/routes');
    http.expectOne({ method: 'GET', url: `${BASE}/routes` }).flush({ ok: true });
    expect(await promise).toEqual({ ok: true });
  });

  it('respeta una URL completa', async () => {
    const promise = api.get<unknown>('http://localhost:3000/health');
    http.expectOne('http://localhost:3000/health').flush({ ok: true });
    expect(await promise).toEqual({ ok: true });
  });

  it('envía el cuerpo en post, put y patch, y nada en un patch sin cuerpo', async () => {
    const body = { title: 'Ruta' };

    const post = api.post('/routes', body);
    const postRequest = http.expectOne({ method: 'POST', url: `${BASE}/routes` });
    expect(postRequest.request.body).toEqual(body);
    postRequest.flush({});

    const put = api.put('/routes/1', body);
    http.expectOne({ method: 'PUT', url: `${BASE}/routes/1` }).flush({});

    const patch = api.patch('/routes/1/delete');
    const patchRequest = http.expectOne({ method: 'PATCH', url: `${BASE}/routes/1/delete` });
    expect(patchRequest.request.body).toBeNull();
    patchRequest.flush(null, { status: 204, statusText: 'No Content' });

    const remove = api.delete('/routes/1');
    http.expectOne({ method: 'DELETE', url: `${BASE}/routes/1` }).flush({});

    await Promise.all([post, put, patch, remove]);
  });

  it('no añade cabecera de autorización mientras no hay token', async () => {
    const promise = api.get('/routes');
    const request = http.expectOne(`${BASE}/routes`);
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush([]);
    await promise;
  });

  it('rechaza con un ApiError de validación y marca la API como conectada', async () => {
    const promise = api.post('/routes', {});
    http.expectOne(`${BASE}/routes`).flush(
      { statusCode: 400, message: 'Validation failed', details: [{ field: 'title', message: 'title is required' }] },
      { status: 400, statusText: 'Bad Request' },
    );

    const error = await rejection(promise);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).type).toBe('validation');
    expect((error as ApiError).fieldErrors).toEqual({ title: 'Este campo es obligatorio.' });
    expect(status.status()).toBe('online');
  });

  it('rechaza con un ApiError de servidor ante un 500', async () => {
    const promise = api.get('/routes');
    http.expectOne(`${BASE}/routes`).flush(
      { message: 'Internal server error' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    expect(((await rejection(promise)) as ApiError).type).toBe('server');
  });

  it('rechaza con un ApiError de red y marca la API como caída', async () => {
    const promise = api.get('/routes');
    http.expectOne(`${BASE}/routes`).error(new ProgressEvent('error'));

    expect(((await rejection(promise)) as ApiError).type).toBe('network');
    expect(status.status()).toBe('offline');
  });

  it('corta la petición al pasar el tiempo de espera', async () => {
    jasmine.clock().install();
    try {
      const promise = api.get('/routes', { context: new HttpContext().set(REQUEST_TIMEOUT, 50) });
      const request = http.expectOne(`${BASE}/routes`);

      jasmine.clock().tick(51);

      expect(((await rejection(promise)) as ApiError).type).toBe('timeout');
      expect(request.cancelled).toBeTrue();
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
