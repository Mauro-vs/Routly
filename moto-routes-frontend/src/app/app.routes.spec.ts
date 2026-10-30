import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { AuthStore } from './auth/auth.store';
import { fakeToken, fakeUser } from './auth/auth.testing';
import { safeReturnUrl } from './auth/return-url';

const KEY = 'routly.session';
type Who = 'anónimo' | 'rider' | 'host' | 'admin';

/** Dónde acaba cada persona al pedir cada dirección: los guards y las rutas juntos. */
describe('Rutas y guards', () => {
  async function visit(who: Who, url: string): Promise<string> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    if (who !== 'anónimo') {
      TestBed.inject(AuthStore).login({ token: fakeToken(), user: fakeUser(who) });
    }

    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    return router.url;
  }

  beforeEach(() => localStorage.removeItem(KEY));
  afterEach(() => localStorage.removeItem(KEY));

  const cases: [Who, string, string][] = [
    ['anónimo', '/', '/login'],
    ['anónimo', '/users', '/login?returnUrl=%2Fusers'],
    ['anónimo', '/routes/sierra/edit', '/login?returnUrl=%2Froutes%2Fsierra%2Fedit'],
    ['anónimo', '/profile', '/login?returnUrl=%2Fprofile'],
    ['anónimo', '/profile/garage', '/login?returnUrl=%2Fprofile%2Fgarage'],
    ['anónimo', '/forbidden', '/login?returnUrl=%2Fforbidden'],
    ['anónimo', '/no-existe', '/login?returnUrl=%2Fno-existe'],
    ['anónimo', '/login', '/login'],
    ['anónimo', '/register', '/register'],

    ['rider', '/', '/profile'],
    ['rider', '/users', '/forbidden'],
    ['rider', '/profile', '/profile'],
    ['rider', '/profile/garage', '/profile/garage'],
    ['rider', '/login', '/profile'],
    ['rider', '/register', '/profile'],

    ['host', '/', '/profile'],
    ['host', '/routes', '/forbidden'],
    ['host', '/profile', '/profile'],

    ['admin', '/', '/'],
    ['admin', '/users', '/users'],
    ['admin', '/profile', '/profile'],
    ['admin', '/login', '/'],
    ['admin', '/register', '/'],
    ['admin', '/no-existe', '/no-existe'],
  ];

  for (const [who, url, expected] of cases) {
    it(`${who} en ${url} acaba en ${expected}`, async () => {
      expect(await visit(who, url)).toBe(expected);
    });
  }

  it('la portada de un admin es el Dashboard, no una zona vacía', async () => {
    await visit('admin', '/');

    let route = TestBed.inject(Router).routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    expect(route.title).toBe('Dashboard');
  });

  it('sin confirmar el token (la API no respondía) se puede entrar: lo revisa SessionService', async () => {
    localStorage.setItem(KEY, JSON.stringify({ token: fakeToken() }));

    expect(await visit('anónimo', '/users')).toBe('/users');
  });
});

describe('safeReturnUrl', () => {
  it('deja las rutas internas, con sus parámetros', () => {
    expect(safeReturnUrl('/users')).toBe('/users');
    expect(safeReturnUrl('/routes?estado=active&pagina=2')).toBe('/routes?estado=active&pagina=2');
  });

  it('cualquier otra cosa vuelve a la portada', () => {
    for (const value of ['//otra.com', '/\\otra.com', 'https://otra.com', 'javascript:alert(1)', '', null, undefined, '/login', '/login?returnUrl=/x']) {
      expect(safeReturnUrl(value)).withContext(String(value)).toBe('/');
    }
  });
});
