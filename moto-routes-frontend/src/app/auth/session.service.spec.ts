import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { FORCED_NAVIGATION } from '../core/guards/unsaved-changes.guard';
import { errorInterceptor } from '../core/interceptors/error.interceptor';
import { timeoutInterceptor } from '../core/interceptors/timeout.interceptor';
import { ApiService } from '../core/services/api.service';
import { ApiStatusService } from '../core/services/api-status.service';
import { NotificationService } from '../core/services/notification.service';
import { SessionResetService } from '../core/services/session-reset.service';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth.store';
import { fakeToken, fakeUser } from './auth.testing';
import { SessionService } from './session.service';

const BASE = environment.apiUrl;
const KEY = 'routly.session';

describe('Fin de la sesión', () => {
  let api: ApiService;
  let store: AuthStore;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;
  let notifications: jasmine.SpyObj<NotificationService>;
  let resets: jasmine.Spy;

  function setup(): void {
    notifications = jasmine.createSpyObj<NotificationService>('notifications', ['warning', 'errorToast']);
    notifications.warning.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor, timeoutInterceptor, authInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    api = TestBed.inject(ApiService);
    store = TestBed.inject(AuthStore);
    http = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    resets = jasmine.createSpy('reset');
    TestBed.inject(SessionResetService).register(resets);
    TestBed.inject(SessionService);
  }

  function loggedIn(role = 'admin', expiresIn = 3600): void {
    setup();
    store.login({ token: fakeToken(expiresIn), user: fakeUser(role) });
  }

  const unauthorized = (code?: string) => ({
    body: { message: 'Authentication required', code },
    options: { status: 401, statusText: 'Unauthorized' },
  });

  beforeEach(() => localStorage.removeItem(KEY));
  afterEach(() => {
    http.verify();
    localStorage.removeItem(KEY);
  });

  it('TOKEN_EXPIRED: limpia, avisa de que ha caducado y va al login', async () => {
    loggedIn();

    const promise = api.get('/users').catch(() => null);
    const { body, options } = unauthorized('TOKEN_EXPIRED');
    http.expectOne(`${BASE}/users`).flush(body, options);
    await promise;

    expect(store.isAuthenticated()).toBeFalse();
    expect(resets).toHaveBeenCalledTimes(1);
    expect(notifications.warning).toHaveBeenCalledOnceWith('Tu sesión ha caducado. Inicia sesión de nuevo.');
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('TOKEN_INVALID: su propio aviso', async () => {
    loggedIn();

    const promise = api.get('/users').catch(() => null);
    const { body, options } = unauthorized('TOKEN_INVALID');
    http.expectOne(`${BASE}/users`).flush(body, options);
    await promise;

    expect(notifications.warning).toHaveBeenCalledOnceWith('Tu sesión ya no es válida. Inicia sesión de nuevo.');
  });

  it('nueve 401 a la vez: una sola limpieza, un aviso y una redirección', async () => {
    loggedIn();
    const paths = Array.from({ length: 9 }, (_, index) => `/c${index}`);

    const promises = paths.map((path) => api.get(path).catch(() => null));
    const { body, options } = unauthorized('TOKEN_INVALID');
    for (const path of paths) http.expectOne(`${BASE}${path}`).flush(body, options);
    await Promise.all(promises);

    expect(resets).toHaveBeenCalledTimes(1);
    expect(notifications.warning).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('la redirección es forzada, para que un formulario a medias no la retenga', async () => {
    loggedIn();
    spyOnProperty(TestBed.inject(Router), 'url').and.returnValue('/routes/sierra/edit?x=1');

    const promise = api.get('/users').catch(() => null);
    const { body, options } = unauthorized('TOKEN_INVALID');
    http.expectOne(`${BASE}/users`).flush(body, options);
    await promise;

    expect(navigate).toHaveBeenCalledOnceWith(['/login'], {
      queryParams: { returnUrl: '/routes/sierra/edit?x=1' },
      info: FORCED_NAVIGATION,
    });
  });

  it('un 401 sin token enviado no toca nada: no había sesión', async () => {
    setup();

    const promise = api.get('/users').catch(() => null);
    const { body, options } = unauthorized();
    http.expectOne(`${BASE}/users`).flush(body, options);
    await promise;

    expect(navigate).not.toHaveBeenCalled();
    expect(notifications.warning).not.toHaveBeenCalled();
  });

  it('un 403 relee el usuario: si ya no es admin, sale del panel sin cerrar la sesión', async () => {
    loggedIn('admin');

    const promise = api.get('/users').catch(() => null);
    http.expectOne(`${BASE}/users`).flush({}, { status: 403, statusText: 'Forbidden' });
    await promise;

    http.expectOne(`${BASE}/auth/me`).flush(fakeUser('rider'));
    await new Promise((resolve) => setTimeout(resolve));

    expect(store.isAdmin()).toBeFalse();
    expect(store.isAuthenticated()).toBeTrue();
    expect(navigate).toHaveBeenCalledOnceWith(['/forbidden'], { info: FORCED_NAVIGATION });
  });

  it('un 403 de un admin que sigue siéndolo no lo mueve de sitio', async () => {
    loggedIn('admin');

    const promise = api.get('/users').catch(() => null);
    http.expectOne(`${BASE}/users`).flush({}, { status: 403, statusText: 'Forbidden' });
    await promise;

    http.expectOne(`${BASE}/auth/me`).flush(fakeUser('admin'));
    await new Promise((resolve) => setTimeout(resolve));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('logout cierra la sesión en la API y va al login con navegación forzada', async () => {
    loggedIn();
    const navigateByUrl = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    const promise = TestBed.inject(SessionService).logout();
    http.expectOne(`${BASE}/auth/logout`).flush(null, { status: 204, statusText: 'No Content' });
    await promise;

    expect(store.isAuthenticated()).toBeFalse();
    expect(navigateByUrl).toHaveBeenCalledOnceWith('/login', { info: FORCED_NAVIGATION });
    expect(notifications.warning).not.toHaveBeenCalled();
  });

  it('logout en todos los dispositivos llama a logout-all', async () => {
    loggedIn();
    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    const promise = TestBed.inject(SessionService).logout(true);
    http.expectOne(`${BASE}/auth/logout-all`).flush(null, { status: 204, statusText: 'No Content' });
    await promise;

    expect(store.isAuthenticated()).toBeFalse();
  });

  it('un 403 con la sesión ya rechazada termina en el login', async () => {
    loggedIn('admin');

    const promise = api.get('/users').catch(() => null);
    http.expectOne(`${BASE}/users`).flush({}, { status: 403, statusText: 'Forbidden' });
    await promise;

    const { body, options } = unauthorized('TOKEN_INVALID');
    http.expectOne(`${BASE}/auth/me`).flush(body, options);
    await new Promise((resolve) => setTimeout(resolve));

    expect(store.isAuthenticated()).toBeFalse();
    expect(notifications.warning).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('se cierra sola a la hora de exp', async () => {
    jasmine.clock().install();
    try {
      loggedIn('admin', 60);
      await TestBed.tick();

      jasmine.clock().mockDate(new Date(Date.now() + 61_000));
      jasmine.clock().tick(61_000);

      expect(store.isAuthenticated()).toBeFalse();
      expect(notifications.warning).toHaveBeenCalledOnceWith('Tu sesión ha caducado. Inicia sesión de nuevo.');
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('otra pestaña cierra la sesión: se vacían los datos y va al login, sin aviso', async () => {
    loggedIn();

    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: null }));
    await TestBed.tick();

    expect(resets).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(notifications.warning).not.toHaveBeenCalled();
  });

  it('sin conexión al arrancar: al volver la API se confirma el token', async () => {
    localStorage.setItem(KEY, JSON.stringify({ token: fakeToken() }));
    setup();
    await TestBed.tick();
    http.expectNone(`${BASE}/auth/me`);

    TestBed.inject(ApiStatusService).markOnline();
    await TestBed.tick();

    http.expectOne(`${BASE}/auth/me`).flush(fakeUser());
    await new Promise((resolve) => setTimeout(resolve));
    expect(store.unverified()).toBeFalse();
  });
});
