import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { fakeToken, fakeUser } from './testing/auth.testing';
import { AuthStore } from './auth.store';

const KEY = 'routly.session';

describe('AuthStore', () => {
  function create(): AuthStore {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    return TestBed.inject(AuthStore);
  }

  beforeEach(() => localStorage.removeItem(KEY));
  afterEach(() => localStorage.removeItem(KEY));

  it('login guarda en localStorage solo cuándo caduca: ni el token ni el usuario', () => {
    const store = create();
    const before = Date.now();

    expect(store.login({ expiresIn: 3600, user: fakeUser() })).toBeTrue();

    const raw = localStorage.getItem(KEY) ?? '';
    const saved = JSON.parse(raw) as Record<string, unknown>;
    expect(Object.keys(saved)).toEqual(['expiresAt']);
    expect(saved['expiresAt']).toBeGreaterThanOrEqual(before + 3600_000);
    expect(raw).not.toContain('token');
    expect(store.isAuthenticated()).toBeTrue();
    expect(store.expiresAt()).toBe(saved['expiresAt'] as number);
  });

  it('restaura la sesión al recargar, aún sin confirmar por la API', () => {
    const expiresAt = Date.now() + 3600_000;
    localStorage.setItem(KEY, JSON.stringify({ expiresAt }));

    const store = create();

    expect(store.isAuthenticated()).toBeTrue();
    expect(store.expiresAt()).toBe(expiresAt);
    expect(store.user()).toBeNull();
    expect(store.unverified()).toBeTrue();
  });

  it('descarta una sesión caducada o mal guardada', () => {
    for (const saved of [
      JSON.stringify({ expiresAt: Date.now() - 10 }),
      JSON.stringify({ expiresAt: 'mañana' }),
      JSON.stringify({ token: fakeToken() }),
      'esto no es JSON',
    ]) {
      TestBed.resetTestingModule();
      localStorage.setItem(KEY, saved);
      const store = create();
      expect(store.isAuthenticated()).withContext(saved).toBeFalse();
    }
  });

  it('una sesión guardada por la versión anterior (con el token) se reescribe sin él', () => {
    const expiresAt = Date.now() + 3600_000;
    localStorage.setItem(KEY, JSON.stringify({ token: fakeToken(), expiresAt }));

    const store = create();

    expect(store.isAuthenticated()).toBeTrue();
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}')).toEqual({ expiresAt });
  });

  it('login rechaza un plazo que no sirve y no guarda nada', () => {
    const store = create();

    expect(store.login({ expiresIn: -10, user: fakeUser() })).toBeFalse();
    expect(store.login({ expiresIn: Number.NaN, user: fakeUser() })).toBeFalse();

    expect(store.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('funciona aunque localStorage esté bloqueado', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('bloqueado');
    spyOn(Storage.prototype, 'setItem').and.throwError('bloqueado');
    const remove = spyOn(Storage.prototype, 'removeItem').and.throwError('bloqueado');

    const store = create();
    expect(store.isAuthenticated()).toBeFalse();
    expect(store.login({ expiresIn: 3600, user: fakeUser() })).toBeTrue();
    expect(store.isAuthenticated()).toBeTrue();
    store.logout();
    expect(store.isAuthenticated()).toBeFalse();

    remove.and.stub(); // el afterEach limpia con este mismo método
  });

  it('logout borra el estado y lo guardado', () => {
    const store = create();
    store.login({ expiresIn: 3600, user: fakeUser() });

    store.logout();

    expect(store.user()).toBeNull();
    expect(store.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('roles e isAdmin: admin es ADMIN', () => {
    const store = create();
    store.login({ expiresIn: 3600, user: fakeUser('admin') });

    expect(store.roles()).toEqual(['admin', 'ADMIN']);
    expect(store.isAdmin()).toBeTrue();
    expect(store.hasRole('ADMIN')).toBeTrue();
    expect(store.hasRole('admin')).toBeTrue();
    expect(store.hasRole('USER')).toBeFalse();
  });

  it('roles: rider, host y cualquier rol propio son USER', () => {
    const store = create();
    for (const role of ['rider', 'host', 'guia']) {
      store.login({ expiresIn: 3600, user: fakeUser(role) });
      expect(store.roles()).toEqual([role, 'USER']);
      expect(store.isAdmin()).toBeFalse();
      expect(store.hasRole('USER')).toBeTrue();
      expect(store.hasRole(role)).toBeTrue();
    }
  });

  it('el rol sale del usuario de la API', () => {
    const store = create();
    store.login({ expiresIn: 3600, user: fakeUser('rider') });

    expect(store.isAdmin()).toBeFalse();
  });

  it('sin sesión no hay roles', () => {
    const store = create();

    expect(store.roles()).toEqual([]);
    expect(store.hasRole('USER')).toBeFalse();
  });

  it('otra pestaña cierra la sesión: esta también', () => {
    const store = create();
    store.login({ expiresIn: 3600, user: fakeUser() });

    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: null }));

    expect(store.isAuthenticated()).toBeFalse();
    expect(store.user()).toBeNull();
    expect(store.foreignChanges()).toBe(1);
  });

  it('otra pestaña inicia otra sesión: se adopta, sin confirmar', () => {
    const store = create();
    const expiresAt = Date.now() + 7200_000;

    window.dispatchEvent(
      new StorageEvent('storage', { key: KEY, newValue: JSON.stringify({ expiresAt }) }),
    );

    expect(store.expiresAt()).toBe(expiresAt);
    expect(store.unverified()).toBeTrue();
  });

  it('ignora los cambios de otras claves del almacenamiento', () => {
    const store = create();
    store.login({ expiresIn: 3600, user: fakeUser() });

    window.dispatchEvent(new StorageEvent('storage', { key: 'routly.nav.collapsed', newValue: '[]' }));

    expect(store.isAuthenticated()).toBeTrue();
    expect(store.foreignChanges()).toBe(0);
  });
});
