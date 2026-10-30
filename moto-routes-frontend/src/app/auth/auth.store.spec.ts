import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { fakeToken, fakeUser } from './auth.testing';
import { AuthStore, tokenExpiry } from './auth.store';

const KEY = 'routly.session';

describe('AuthStore', () => {
  function create(): AuthStore {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    return TestBed.inject(AuthStore);
  }

  beforeEach(() => localStorage.removeItem(KEY));
  afterEach(() => localStorage.removeItem(KEY));

  it('login guarda en localStorage solo el token y su caducidad, sin el usuario', () => {
    const store = create();
    const token = fakeToken();

    expect(store.login({ token, user: fakeUser() })).toBeTrue();

    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, unknown>;
    expect(Object.keys(saved).sort()).toEqual(['expiresAt', 'token']);
    expect(saved['token']).toBe(token);
    expect(store.isAuthenticated()).toBeTrue();
    expect(store.token()).toBe(token);
  });

  it('restaura la sesión al recargar, aún sin confirmar por la API', () => {
    const token = fakeToken();
    localStorage.setItem(KEY, JSON.stringify({ token, expiresAt: 1 }));

    const store = create();

    expect(store.token()).toBe(token);
    expect(store.expiresAt()).toBe(tokenExpiry(token));
    expect(store.user()).toBeNull();
    expect(store.unverified()).toBeTrue();
  });

  it('descarta un token caducado o mal formado', () => {
    for (const saved of [
      JSON.stringify({ token: fakeToken(-10) }),
      JSON.stringify({ token: 'no-es-un-token' }),
      JSON.stringify({ token: 42 }),
      'esto no es JSON',
    ]) {
      TestBed.resetTestingModule();
      localStorage.setItem(KEY, saved);
      const store = create();
      expect(store.isAuthenticated()).withContext(saved).toBeFalse();
    }
  });

  it('login rechaza un token que no sirve y no guarda nada', () => {
    const store = create();

    expect(store.login({ token: 'malo', user: fakeUser() })).toBeFalse();
    expect(store.login({ token: fakeToken(-10), user: fakeUser() })).toBeFalse();

    expect(store.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('funciona aunque localStorage esté bloqueado', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('bloqueado');
    spyOn(Storage.prototype, 'setItem').and.throwError('bloqueado');
    const remove = spyOn(Storage.prototype, 'removeItem').and.throwError('bloqueado');

    const store = create();
    expect(store.isAuthenticated()).toBeFalse();
    expect(store.login({ token: fakeToken(), user: fakeUser() })).toBeTrue();
    expect(store.isAuthenticated()).toBeTrue();
    store.logout();
    expect(store.isAuthenticated()).toBeFalse();

    remove.and.stub(); // el afterEach limpia con este mismo método
  });

  it('logout borra el estado y lo guardado', () => {
    const store = create();
    store.login({ token: fakeToken(), user: fakeUser() });

    store.logout();

    expect(store.user()).toBeNull();
    expect(store.token()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('roles e isAdmin: admin es ADMIN', () => {
    const store = create();
    store.login({ token: fakeToken(), user: fakeUser('admin') });

    expect(store.roles()).toEqual(['admin', 'ADMIN']);
    expect(store.isAdmin()).toBeTrue();
    expect(store.hasRole('ADMIN')).toBeTrue();
    expect(store.hasRole('admin')).toBeTrue();
    expect(store.hasRole('USER')).toBeFalse();
  });

  it('roles: rider, host y cualquier rol propio son USER', () => {
    const store = create();
    for (const role of ['rider', 'host', 'guia']) {
      store.login({ token: fakeToken(), user: fakeUser(role) });
      expect(store.roles()).toEqual([role, 'USER']);
      expect(store.isAdmin()).toBeFalse();
      expect(store.hasRole('USER')).toBeTrue();
      expect(store.hasRole(role)).toBeTrue();
    }
  });

  it('el rol sale del usuario de la API, no del token', () => {
    const store = create();
    store.login({ token: fakeToken(3600, 'admin'), user: fakeUser('rider') });

    expect(store.isAdmin()).toBeFalse();
  });

  it('sin sesión no hay roles', () => {
    const store = create();

    expect(store.roles()).toEqual([]);
    expect(store.hasRole('USER')).toBeFalse();
  });

  it('otra pestaña cierra la sesión: esta también', () => {
    const store = create();
    store.login({ token: fakeToken(), user: fakeUser() });

    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: null }));

    expect(store.isAuthenticated()).toBeFalse();
    expect(store.user()).toBeNull();
    expect(store.foreignChanges()).toBe(1);
  });

  it('otra pestaña inicia otra sesión: se adopta su token, sin confirmar', () => {
    const store = create();
    const token = fakeToken(7200);

    window.dispatchEvent(
      new StorageEvent('storage', { key: KEY, newValue: JSON.stringify({ token }) }),
    );

    expect(store.token()).toBe(token);
    expect(store.unverified()).toBeTrue();
  });

  it('ignora los cambios de otras claves del almacenamiento', () => {
    const store = create();
    store.login({ token: fakeToken(), user: fakeUser() });

    window.dispatchEvent(new StorageEvent('storage', { key: 'routly.nav.collapsed', newValue: '[]' }));

    expect(store.isAuthenticated()).toBeTrue();
    expect(store.foreignChanges()).toBe(0);
  });
});
