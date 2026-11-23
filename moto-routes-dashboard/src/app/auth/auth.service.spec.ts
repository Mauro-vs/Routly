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
import { fakeSession, fakeUser, savedSession } from './testing/auth.testing';

const BASE = environment.apiUrl;
const AUTH = environment.authUrl;
const ME = `${BASE}/profile/me`;
const expired = { status: 401, statusText: 'Unauthorized' };
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
        // El errorInterceptor trae SessionService, que al cerrarse una sesión va al login
        provideRouter([{ path: 'login', children: [] }]),
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

  it('login abre la sesión en auth, trae el usuario de la API y no guarda el token', async () => {
    setup();
    const session = fakeSession();
    const before = Date.now();

    const promise = service.login({ email: 'a@b.es', password: 'clave1234' });
    const request = http.expectOne({ method: 'POST', url: `${AUTH}/login` });
    expect(request.request.body).toEqual({ email: 'a@b.es', password: 'clave1234' });
    expect(request.request.withCredentials).toBeTrue();
    request.flush(session);
    await tick();
    http.expectOne({ method: 'GET', url: ME }).flush(fakeUser());

    expect((await promise).name).toBe('Ana');
    expect(store.isAuthenticated()).toBeTrue();
    expect(store.user()?.role.name).toBe('admin');
    // La sesión dura lo que el refresh (7 días), no lo que el token de acceso
    expect(store.expiresAt()).toBeGreaterThanOrEqual(before + session.refreshExpiresIn * 1000);
    // Los tokens viven en las cookies httpOnly: el del body no se guarda en ningún sitio
    expect(localStorage.getItem(KEY)).not.toContain(session.token ?? '');
  });

  it('register inicia sesión con lo que devuelve auth', async () => {
    setup();

    const promise = service.register({ name: 'Ana', email: 'a@b.es', password: 'clave1234' });
    http.expectOne({ method: 'POST', url: `${AUTH}/register` }).flush(fakeSession('rider'));
    await tick();
    http.expectOne(ME).flush(fakeUser('rider'));
    await promise;

    expect(store.isAuthenticated()).toBeTrue();
    expect(store.isAdmin()).toBeFalse();
  });

  it('una respuesta de login sin plazo de renovación o sin usuario válido no crea sesión', async () => {
    setup();
    const { user } = fakeSession();
    for (const body of [
      { user },
      { refreshExpiresIn: 'mañana', user },
      { refreshExpiresIn: 0, user },
      { refreshExpiresIn: 3600 },
      { refreshExpiresIn: 3600, user: { name: 'Sin id' } },
    ]) {
      const promise = service.login({ email: 'a@b.es', password: 'clave1234' });
      http.expectOne(`${AUTH}/login`).flush(body);

      const error = await promise.catch((failure: unknown) => failure);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).type).toBe('server');
      expect(store.isAuthenticated()).toBeFalse();
    }
  });

  it('si la API devuelve otro usuario o uno sin rol, no crea sesión', async () => {
    setup();
    for (const user of [{ ...fakeUser(), _id: '2' }, { name: 'Sin rol' }]) {
      const promise = service.login({ email: 'a@b.es', password: 'clave1234' });
      http.expectOne(`${AUTH}/login`).flush(fakeSession());
      await tick();
      http.expectOne(ME).flush(user);

      const error = await promise.catch((failure: unknown) => failure);
      expect((error as ApiError).type).toBe('server');
      expect(store.isAuthenticated()).toBeFalse();
    }
  });

  it('un 401 del login es un error de credenciales: rechaza y no navega', async () => {
    setup();
    const navigate = spyOn(TestBed.inject(Router), 'navigate');

    const promise = service.login({ email: 'a@b.es', password: 'mal' });
    http
      .expectOne(`${AUTH}/login`)
      .flush({ message: 'Invalid email or password' }, { status: 401, statusText: 'Unauthorized' });

    const error = (await promise.catch((failure: unknown) => failure)) as ApiError;
    expect(error.message).toBe('El correo o la contraseña no son correctos.');
    expect(navigate).not.toHaveBeenCalled();
  });

  describe('loadSession', () => {
    function withSavedSession(): void {
      localStorage.setItem(KEY, savedSession());
      setup();
    }

    it('sin sesión guardada no pregunta nada: se entra como anónimo', async () => {
      setup();
      expect(await service.loadSession()).toBeFalse();
    });

    it('con una sesión guardada vigente, pregunta a la API (la cookie decide) y trae el usuario', async () => {
      withSavedSession();

      const promise = service.loadSession();
      const request = http.expectOne(ME);
      expect(request.request.withCredentials).toBeTrue();
      request.flush(fakeUser('host'));

      expect(await promise).toBeTrue();
      expect(store.user()?.role.name).toBe('host');
      expect(store.unverified()).toBeFalse();
    });

    it('un 401 cierra la sesión y vacía los datos', async () => {
      withSavedSession();

      const promise = service.loadSession();
      http
        .expectOne(ME)
        .flush({ code: 'TOKEN_INVALID' }, { status: 401, statusText: 'Unauthorized' });

      expect(await promise).toBeFalse();
      expect(store.isAuthenticated()).toBeFalse();
      expect(resets).toHaveBeenCalled();
    });

    it('un fallo de red conserva la sesión: no dice nada de la cookie', async () => {
      withSavedSession();

      const promise = service.loadSession();
      http.expectOne(ME).error(new ProgressEvent('error'));

      expect(await promise).toBeFalse();
      expect(store.isAuthenticated()).toBeTrue();
      expect(store.unverified()).toBeTrue();
      expect(resets).not.toHaveBeenCalled();
    });

    it('varias llamadas a la vez comparten la misma petición', async () => {
      withSavedSession();

      const first = service.loadSession();
      const second = service.loadSession();
      http.expectOne(ME).flush(fakeUser());

      expect(await Promise.all([first, second])).toEqual([true, true]);
    });

    it('con el token de acceso caducado, lo renueva una vez y vuelve a preguntar', async () => {
      withSavedSession();

      const promise = service.loadSession();
      http.expectOne(ME).flush({ code: 'TOKEN_EXPIRED' }, expired);
      await tick();
      const refresh = http.expectOne({ method: 'POST', url: `${AUTH}/refresh` });
      expect(refresh.request.withCredentials).toBeTrue();
      refresh.flush(fakeSession());
      await tick();
      http.expectOne(ME).flush(fakeUser());

      expect(await promise).toBeTrue();
      expect(store.user()?.name).toBe('Ana');
    });

    it('al volver pasados 15 min (sin cookie de acceso, 401 sin code) renueva y sigue dentro', async () => {
      withSavedSession();

      const promise = service.loadSession();
      http.expectOne(ME).flush({ message: 'Authentication required' }, expired);
      await tick();
      http.expectOne({ method: 'POST', url: `${AUTH}/refresh` }).flush(fakeSession());
      await tick();
      http.expectOne(ME).flush(fakeUser());

      expect(await promise).toBeTrue();
      expect(store.isAuthenticated()).toBeTrue();
    });

    it('si auth tampoco renueva la sesión, se cierra', async () => {
      withSavedSession();

      const promise = service.loadSession();
      http.expectOne(ME).flush({ code: 'TOKEN_EXPIRED' }, expired);
      await tick();
      http.expectOne(`${AUTH}/refresh`).flush({ code: 'TOKEN_INVALID' }, expired);

      expect(await promise).toBeFalse();
      expect(store.isAuthenticated()).toBeFalse();
      expect(resets).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    function withSavedSession(): void {
      localStorage.setItem(KEY, savedSession(60_000));
      setup();
    }

    it('guarda el nuevo plazo de la sesión', async () => {
      withSavedSession();
      const before = Date.now();

      const promise = service.refresh();
      http.expectOne({ method: 'POST', url: `${AUTH}/refresh` }).flush(fakeSession('admin', 3600));

      expect(await promise).toBeTrue();
      expect(store.expiresAt()).toBeGreaterThanOrEqual(before + 3600_000);
    });

    it('varias llamadas a la vez comparten un solo refresh (un refresh usado ya no sirve)', async () => {
      withSavedSession();

      const all = Promise.all([service.refresh(), service.refresh()]);
      http.expectOne(`${AUTH}/refresh`).flush(fakeSession());

      expect(await all).toEqual([true, true]);
    });

    it('sin red rechaza y conserva la sesión', async () => {
      withSavedSession();

      const promise = service.refresh();
      http.expectOne(`${AUTH}/refresh`).error(new ProgressEvent('error'));

      expect(await promise.catch(() => 'rechazada')).toBe('rechazada');
      expect(store.isAuthenticated()).toBeTrue();
    });

    it('sin sesión no pregunta nada', async () => {
      setup();
      expect(await service.refresh()).toBeFalse();
      http.expectNone(`${AUTH}/refresh`);
    });
  });

  describe('refreshUser', () => {
    it('pone al día el usuario de la sesión con lo que devuelve la API', async () => {
      setup();
      store.login({ expiresIn: 3600, user: fakeUser() });

      const promise = service.refreshUser();
      const photo = { _id: 'i1', url: 'https://picsum.photos/seed/ana/400', alt: 'Ana' };
      http.expectOne({ method: 'GET', url: ME }).flush({ ...fakeUser(), coverImage: photo });
      await promise;

      expect(store.user()?.coverImage?.url).toBe(photo.url);
    });

    it('si falla, se queda el usuario que había y no cierra la sesión', async () => {
      setup();
      store.login({ expiresIn: 3600, user: fakeUser() });

      const promise = service.refreshUser();
      http.expectOne(ME).error(new ProgressEvent('error'));
      await promise;

      expect(store.user()?.name).toBe('Ana');
      expect(store.isAuthenticated()).toBeTrue();
    });

    it('sin sesión no pregunta nada', async () => {
      setup();
      await service.refreshUser();
      http.expectNone(ME);
      expect(store.isAuthenticated()).toBeFalse();
    });
  });

  describe('logout', () => {
    function loggedIn(): void {
      setup();
      store.login({ expiresIn: 3600, user: fakeUser() });
    }

    it('avisa a la API y limpia la sesión y los datos', async () => {
      loggedIn();

      const promise = service.logout();
      const request = http.expectOne({ method: 'POST', url: `${AUTH}/logout` });
      expect(request.request.withCredentials).toBeTrue();
      request.flush(null, { status: 204, statusText: 'No Content' });
      await promise;

      expect(store.isAuthenticated()).toBeFalse();
      expect(resets).toHaveBeenCalledTimes(1);
    });

    it('limpia aunque falle la red', async () => {
      loggedIn();

      const promise = service.logout();
      http.expectOne(`${AUTH}/logout`).error(new ProgressEvent('error'));
      await promise;

      expect(store.isAuthenticated()).toBeFalse();
      expect(resets).toHaveBeenCalledTimes(1);
    });

    it('un 401 del logout no se trata como una sesión caducada', async () => {
      loggedIn();
      const navigate = spyOn(TestBed.inject(Router), 'navigate');

      const promise = service.logout();
      http
        .expectOne(`${AUTH}/logout`)
        .flush({ code: 'TOKEN_EXPIRED' }, { status: 401, statusText: 'Unauthorized' });
      await promise;

      expect(store.isAuthenticated()).toBeFalse();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('logoutAll cierra todas las sesiones', async () => {
      loggedIn();

      const promise = service.logoutAll();
      http
        .expectOne({ method: 'POST', url: `${AUTH}/logout-all` })
        .flush(null, { status: 204, statusText: 'No Content' });
      await promise;
      await tick();

      expect(store.isAuthenticated()).toBeFalse();
    });

    it('logoutAll con el token de acceso caducado lo renueva y lo repite', async () => {
      loggedIn();

      const promise = service.logoutAll();
      http.expectOne(`${AUTH}/logout-all`).flush({ code: 'TOKEN_EXPIRED' }, expired);
      await tick();
      http.expectOne(`${AUTH}/refresh`).flush(fakeSession());
      await tick();
      http.expectOne(`${AUTH}/logout-all`).flush(null, { status: 204, statusText: 'No Content' });
      await promise;

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
