import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { errorInterceptor } from '../core/interceptors/error.interceptor';
import { timeoutInterceptor } from '../core/interceptors/timeout.interceptor';
import { ApiError } from '../core/models/api-error.model';
import { ApiService } from '../core/services/api.service';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth.store';
import { fakeUser } from './testing/auth.testing';

const BASE = environment.apiUrl;
const KEY = 'routly.session';

describe('authInterceptor', () => {
  let api: ApiService;
  let store: AuthStore;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem(KEY);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor, timeoutInterceptor, authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(ApiService);
    store = TestBed.inject(AuthStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(KEY);
  });

  it('las peticiones a la API van con credenciales (la cookie) y sin cabecera Authorization', async () => {
    store.login({ expiresIn: 3600, user: fakeUser() });

    const promise = api.get('/routes');
    const request = http.expectOne(`${BASE}/routes`);
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush([]);
    await promise;
  });

  it('a otros dominios, o a una URL que solo empiece igual, no van credenciales', async () => {
    store.login({ expiresIn: 3600, user: fakeUser() });

    for (const url of ['https://otro.example.com/api/routes', `${BASE}-falsa/routes`]) {
      const promise = api.get(url);
      const request = http.expectOne(url);
      expect(request.request.withCredentials).withContext(url).toBeFalse();
      request.flush([]);
      await promise;
    }
  });

  it('sin sesión, también con credenciales: la cookie la decide la API', async () => {
    const promise = api.get('/routes');
    const request = http.expectOne(`${BASE}/routes`);
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush([]);
    await promise;
  });

  it('con la sesión caducada no se envía nada: falla aquí y la cierra', async () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    store.login({ expiresIn: 3600, user: fakeUser() });
    spyOn(store, 'expiresAt').and.returnValue(Date.now() - 1000);

    const error = (await api.get('/routes').catch((failure: unknown) => failure)) as ApiError;

    http.expectNone(`${BASE}/routes`);
    expect(error.code).toBe('TOKEN_EXPIRED');
    expect(store.isAuthenticated()).toBeFalse();
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
