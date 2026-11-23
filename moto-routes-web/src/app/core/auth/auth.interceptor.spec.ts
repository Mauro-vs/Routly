import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthUser } from './auth.models';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { AuthStore, SESSION_KEY } from './auth.store';

const RIDER: AuthUser = { id: 'u1', name: 'Lucía', email: 'lucia@routly.dev', role: 'rider' };
const SESSION = { tokenType: 'Bearer', expiresIn: 900, refreshExpiresIn: 604800, user: RIDER };
const expired = { status: 401, statusText: 'Unauthorized' };

/** Espera a que las promesas pendientes avancen (el refresh es una promesa, no un observable). */
const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('authInterceptor y AuthService', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let store: AuthStore;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.removeItem(SESSION_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    backend.verify();
    localStorage.removeItem(SESSION_KEY);
  });

  async function signIn(): Promise<void> {
    const login = auth.login({ email: RIDER.email, password: 'secreta-1' });
    backend.expectOne('/auth/login').flush(SESSION);
    await login;
  }

  it('manda las cookies a los servicios propios, y no a otras webs', () => {
    http.get('/api/shop/experiences').subscribe();
    http.get('https://api.open-meteo.com/v1/forecast').subscribe();

    expect(backend.expectOne('/api/shop/experiences').request.withCredentials).toBeTrue();
    expect(backend.expectOne('https://api.open-meteo.com/v1/forecast').request.withCredentials).toBeFalse();
  });

  it('login guarda la sesión y el usuario', async () => {
    await signIn();
    expect(store.isLoggedIn()).toBeTrue();
    expect(store.user()).toEqual(RIDER);
  });

  it('un 401 con sesión: renueva con /auth/refresh y repite la petición', async () => {
    await signIn();
    const result = firstValueFrom(http.get('/auth/me'));

    backend.expectOne('/auth/me').flush({ code: 'TOKEN_EXPIRED' }, expired);
    await settle();
    const refresh = backend.expectOne('/auth/refresh');
    expect(refresh.request.method).toBe('POST');
    expect(refresh.request.withCredentials).toBeTrue();
    refresh.flush(SESSION);
    await settle();
    backend.expectOne('/auth/me').flush(RIDER);

    expect(await result).toEqual(RIDER);
    expect(store.isLoggedIn()).toBeTrue();
  });

  it('varias peticiones que caducan a la vez comparten un solo refresh', async () => {
    await signIn();
    const results = Promise.all([firstValueFrom(http.get('/api/a')), firstValueFrom(http.get('/api/b'))]);

    backend.expectOne('/api/a').flush({}, expired);
    backend.expectOne('/api/b').flush({}, expired);
    await settle();
    backend.expectOne('/auth/refresh').flush(SESSION);
    await settle();
    backend.expectOne('/api/a').flush({ ok: 'a' });
    backend.expectOne('/api/b').flush({ ok: 'b' });

    expect(await results).toEqual([{ ok: 'a' }, { ok: 'b' }]);
  });

  it('si el refresh falla, se cierra la sesión (logout)', async () => {
    await signIn();
    const result = firstValueFrom(http.get('/api/profile/me'));

    backend.expectOne('/api/profile/me').flush({}, expired);
    await settle();
    backend.expectOne('/auth/refresh').flush({ code: 'TOKEN_INVALID' }, expired);

    await expectAsync(result).toBeRejected();
    expect(store.hasSession()).toBeFalse();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('TOKEN_INVALID (sesión cerrada en otro sitio) cierra la sesión sin intentar renovar', async () => {
    await signIn();
    const result = firstValueFrom(http.get('/api/profile/me'));

    backend.expectOne('/api/profile/me').flush({ code: 'TOKEN_INVALID' }, expired);
    await expectAsync(result).toBeRejected();
    expect(store.hasSession()).toBeFalse();
  });

  it('sin sesión, un 401 no intenta renovar', async () => {
    const result = firstValueFrom(http.get('/api/profile/me'));
    backend.expectOne('/api/profile/me').flush({}, expired);
    await expectAsync(result).toBeRejected();
    backend.expectNone('/auth/refresh');
  });

  it('un login fallido no intenta renovar ni abre sesión', async () => {
    const login = auth.login({ email: RIDER.email, password: 'mal' });
    backend.expectOne('/auth/login').flush({}, expired);
    await expectAsync(login).toBeRejected();
    backend.expectNone('/auth/refresh');
    expect(store.hasSession()).toBeFalse();
  });

  it('logout avisa a auth y cierra la sesión aunque auth no responda', async () => {
    await signIn();
    const logout = auth.logout();
    backend.expectOne('/auth/logout').flush(null, { status: 0, statusText: 'Network error' });
    await logout;
    expect(store.hasSession()).toBeFalse();
  });

  it('restore confirma la sesión guardada con /auth/me', async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: 'u1', expiresAt: Date.now() + 60_000 }));
    // Una sesión que ya estaba en otra pestaña: el store la lee al crearse
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const freshStore = TestBed.inject(AuthStore);
    const freshAuth = TestBed.inject(AuthService);
    const freshBackend = TestBed.inject(HttpTestingController);

    const restoring = freshAuth.restore();
    freshBackend.expectOne('/auth/me').flush(RIDER);
    await restoring;
    expect(freshStore.user()).toEqual(RIDER);
    freshBackend.verify();
    backend = freshBackend;
  });
});
