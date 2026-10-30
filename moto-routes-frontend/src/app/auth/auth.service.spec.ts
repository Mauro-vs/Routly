import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { ApiError } from '../core/models/api-error.model';
import { errorInterceptor } from '../core/interceptors/error.interceptor';
import { timeoutInterceptor } from '../core/interceptors/timeout.interceptor';
import { SessionResetService } from '../core/services/session-reset.service';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';
import { fakeToken, fakeUser } from './auth.testing';

const BASE = environment.apiUrl;
const KEY = 'routly.session';

describe('AuthService', () => {
  let service: AuthService;
  let store: AuthStore;
  let http: HttpTestingController;
  let resets: jasmine.Spy;

  function setup(): void {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor, timeoutInterceptor, authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    store = TestBed.inject(AuthStore);
    http = TestBed.inject(HttpTestingController);
    resets = jasmine.createSpy('reset');
    TestBed.inject(SessionResetService).register(resets);
  }

  /** Deja que las promesas pendientes lleguen a lanzar su petición. */
  const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

  beforeEach(() => localStorage.removeItem(KEY));
  afterEach(() => {
    http.verify();
    localStorage.removeItem(KEY);
  });

  it('login guarda la sesión y devuelve el usuario', async () => {
    setup();
    const token = fakeToken();

    const promise = service.login({ email: 'a@b.es', password: 'clave1234' });
    const request = http.expectOne({ method: 'POST', url: `${BASE}/auth/login` });
    expect(request.request.body).toEqual({ email: 'a@b.es', password: 'clave1234' });
    request.flush({ token, tokenType: 'Bearer', expiresIn: 3600, user: fakeUser() });

    expect((await promise).name).toBe('Ana');
    expect(store.token()).toBe(token);
    expect(store.user()?.name).toBe('Ana');
  });

  it('register inicia sesión con lo que devuelve la API', async () => {
    setup();

    const promise = service.register({ name: 'Ana', email: 'a@b.es', password: 'clave1234' });
    http
      .expectOne({ method: 'POST', url: `${BASE}/auth/register` })
      .flush({ token: fakeToken(), tokenType: 'Bearer', expiresIn: 3600, user: fakeUser('rider') });
    await promise;

    expect(store.isAuthenticated()).toBeTrue();
    expect(store.isAdmin()).toBeFalse();
  });

  it('una respuesta de login sin token o sin usuario válido no crea sesión', async () => {
    setup();
    for (const body of [
      { user: fakeUser() },
      { token: 'malo', user: fakeUser() },
      { token: fakeToken() },
      { token: fakeToken(), user: { name: 'Sin rol' } },
    ]) {
      const promise = service.login({ email: 'a@b.es', password: 'clave1234' });
      http.expectOne(`${BASE}/auth/login`).flush(body);

      const error = await promise.catch((failure: unknown) => failure);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).type).toBe('server');
      expect(store.isAuthenticated()).toBeFalse();
    }
  });

  it('un 401 del login es un error de credenciales: rechaza y no navega', async () => {
    setup();
    const navigate = spyOn(TestBed.inject(Router), 'navigate');

    const promise = service.login({ email: 'a@b.es', password: 'mal' });
    http
      .expectOne(`${BASE}/auth/login`)
      .flush({ message: 'Invalid email or password' }, { status: 401, statusText: 'Unauthorized' });

    const error = (await promise.catch((failure: unknown) => failure)) as ApiError;
    expect(error.message).toBe('El correo o la contraseña no son correctos.');
    expect(navigate).not.toHaveBeenCalled();
  });

  describe('loadSession', () => {
    function withSavedToken(): string {
      const token = fakeToken();
      localStorage.setItem(KEY, JSON.stringify({ token }));
      setup();
      return token;
    }

    it('sin token no pregunta nada', async () => {
      setup();
      expect(await service.loadSession()).toBeFalse();
    });

    it('trae el usuario y confirma la sesión', async () => {
      withSavedToken();

      const promise = service.loadSession();
      const request = http.expectOne(`${BASE}/auth/me`);
      expect(request.request.headers.has('Authorization')).toBeTrue();
      request.flush(fakeUser('host'));

      expect(await promise).toBeTrue();
      expect(store.user()?.role.name).toBe('host');
      expect(store.unverified()).toBeFalse();
    });

    it('un 401 cierra la sesión y vacía los datos', async () => {
      withSavedToken();

      const promise = service.loadSession();
      http
        .expectOne(`${BASE}/auth/me`)
        .flush({ code: 'TOKEN_INVALID' }, { status: 401, statusText: 'Unauthorized' });

      expect(await promise).toBeFalse();
      expect(store.isAuthenticated()).toBeFalse();
      expect(resets).toHaveBeenCalled();
    });

    it('un fallo de red conserva el token: no dice nada de la sesión', async () => {
      const token = withSavedToken();

      const promise = service.loadSession();
      http.expectOne(`${BASE}/auth/me`).error(new ProgressEvent('error'));

      expect(await promise).toBeFalse();
      expect(store.token()).toBe(token);
      expect(store.unverified()).toBeTrue();
      expect(resets).not.toHaveBeenCalled();
    });

    it('varias llamadas a la vez comparten la misma petición', async () => {
      withSavedToken();

      const first = service.loadSession();
      const second = service.loadSession();
      http.expectOne(`${BASE}/auth/me`).flush(fakeUser());

      expect(await Promise.all([first, second])).toEqual([true, true]);
    });
  });

  describe('logout', () => {
    function loggedIn(): void {
      setup();
      store.login({ token: fakeToken(), user: fakeUser() });
    }

    it('avisa a la API y limpia la sesión y los datos', async () => {
      loggedIn();

      const promise = service.logout();
      const request = http.expectOne({ method: 'POST', url: `${BASE}/auth/logout` });
      expect(request.request.headers.has('Authorization')).toBeTrue();
      request.flush(null, { status: 204, statusText: 'No Content' });
      await promise;

      expect(store.isAuthenticated()).toBeFalse();
      expect(resets).toHaveBeenCalledTimes(1);
    });

    it('limpia aunque falle la red', async () => {
      loggedIn();

      const promise = service.logout();
      http.expectOne(`${BASE}/auth/logout`).error(new ProgressEvent('error'));
      await promise;

      expect(store.isAuthenticated()).toBeFalse();
      expect(resets).toHaveBeenCalledTimes(1);
    });

    it('un 401 del logout no se trata como una sesión caducada', async () => {
      loggedIn();
      const navigate = spyOn(TestBed.inject(Router), 'navigate');

      const promise = service.logout();
      http
        .expectOne(`${BASE}/auth/logout`)
        .flush({ code: 'TOKEN_EXPIRED' }, { status: 401, statusText: 'Unauthorized' });
      await promise;

      expect(store.isAuthenticated()).toBeFalse();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('logoutAll cierra todas las sesiones', async () => {
      loggedIn();

      const promise = service.logoutAll();
      http
        .expectOne({ method: 'POST', url: `${BASE}/auth/logout-all` })
        .flush(null, { status: 204, statusText: 'No Content' });
      await promise;
      await tick();

      expect(store.isAuthenticated()).toBeFalse();
    });
  });

  it('no depende de Router ni de los avisos', () => {
    setup();
    const source = AuthService.toString();

    expect(source).not.toContain('Router');
    expect(source).not.toContain('NotificationService');
  });
});
