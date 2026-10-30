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
import { fakeToken, fakeUser } from './auth.testing';

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

  it('añade el token a las peticiones a la API', async () => {
    const token = fakeToken();
    store.login({ token, user: fakeUser() });

    const promise = api.get('/routes');
    const request = http.expectOne(`${BASE}/routes`);
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    request.flush([]);
    await promise;
  });

  it('no lo envía a otros dominios, ni a una URL que solo empiece igual', async () => {
    store.login({ token: fakeToken(), user: fakeUser() });

    for (const url of ['https://otro.example.com/api/routes', `${BASE}-falsa/routes`]) {
      const promise = api.get(url);
      const request = http.expectOne(url);
      expect(request.request.headers.has('Authorization')).withContext(url).toBeFalse();
      request.flush([]);
      await promise;
    }
  });

  it('sin sesión, la petición sale tal cual', async () => {
    const promise = api.get('/routes');
    const request = http.expectOne(`${BASE}/routes`);
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush([]);
    await promise;
  });

  it('un token caducado no se envía: falla aquí y cierra la sesión', async () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    store.login({ token: fakeToken(), user: fakeUser() });
    spyOn(store, 'expiresAt').and.returnValue(Date.now() - 1000);

    const error = (await api.get('/routes').catch((failure: unknown) => failure)) as ApiError;

    http.expectNone(`${BASE}/routes`);
    expect(error.code).toBe('TOKEN_EXPIRED');
    expect(store.token()).toBeNull();
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
