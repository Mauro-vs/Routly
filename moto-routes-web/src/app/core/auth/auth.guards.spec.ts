import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { authGuard, guestGuard, safeReturnUrl } from './auth.guards';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

describe('guards de la cuenta', () => {
  let loggedIn: boolean;

  beforeEach(() => {
    loggedIn = false;
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: { restore: () => Promise.resolve() } },
        { provide: AuthStore, useValue: { isLoggedIn: () => loggedIn } },
      ],
    });
  });

  const run = (guard: typeof authGuard, url = '/mi-cuenta') =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    ) as Promise<boolean | UrlTree>;

  it('authGuard: sin sesión, al login con la vuelta', async () => {
    const result = await run(authGuard);
    expect(result instanceof UrlTree).toBeTrue();
    expect(result.toString()).toBe('/entrar?volver=%2Fmi-cuenta');
  });

  it('authGuard: con sesión, pasa', async () => {
    loggedIn = true;
    expect(await run(authGuard)).toBeTrue();
  });

  it('guestGuard: con sesión, a Mi cuenta', async () => {
    loggedIn = true;
    expect((await run(guestGuard, '/entrar')).toString()).toBe('/mi-cuenta');
  });

  it('solo vuelve a rutas propias', () => {
    expect(safeReturnUrl('/experiencias/ruta-1')).toBe('/experiencias/ruta-1');
    expect(safeReturnUrl('//evil.com')).toBe('/mi-cuenta');
    expect(safeReturnUrl('https://evil.com')).toBe('/mi-cuenta');
    expect(safeReturnUrl(undefined)).toBe('/mi-cuenta');
  });
});
