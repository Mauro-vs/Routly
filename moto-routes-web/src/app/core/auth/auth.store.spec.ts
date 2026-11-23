import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthUser } from './auth.models';
import { AuthStore, SESSION_KEY, parseSession } from './auth.store';

const RIDER: AuthUser = { id: 'u1', name: 'Lucía Pérez', email: 'lucia@routly.dev', role: 'rider' };

describe('AuthStore', () => {
  function create(): AuthStore {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    return TestBed.inject(AuthStore);
  }

  beforeEach(() => localStorage.removeItem(SESSION_KEY));
  afterEach(() => localStorage.removeItem(SESSION_KEY));

  it('al entrar guarda de quién es la sesión y hasta cuándo se renueva, nunca un token', () => {
    const store = create();
    store.signIn({ expiresIn: 900, refreshExpiresIn: 3600, user: RIDER });

    expect(store.isLoggedIn()).toBeTrue();
    expect(store.firstName()).toBe('Lucía');
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY)!);
    expect(Object.keys(saved).sort()).toEqual(['expiresAt', 'userId']);
    expect(saved.userId).toBe('u1');
    expect(saved.expiresAt).toBeGreaterThan(Date.now() + 3500_000);
  });

  it('una sesión guardada arranca sin confirmar', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: 'u1', expiresAt: Date.now() + 60_000 }));
    const store = create();
    expect(store.hasSession()).toBeTrue();
    expect(store.isLoggedIn()).toBeFalse();
  });

  it('descarta una sesión caducada o rota', () => {
    expect(parseSession(JSON.stringify({ userId: 'u1', expiresAt: Date.now() - 1 }))).toBeNull();
    expect(parseSession('{no es json')).toBeNull();
    expect(parseSession(JSON.stringify({ expiresAt: Date.now() + 1000 }))).toBeNull();
  });

  it('otra pestaña cierra la sesión: aquí también se cierra', () => {
    const store = create();
    store.signIn({ expiresIn: 900, refreshExpiresIn: 3600, user: RIDER });

    window.dispatchEvent(new StorageEvent('storage', { key: SESSION_KEY, newValue: null }));
    expect(store.hasSession()).toBeFalse();
    expect(store.user()).toBeNull();
  });

  it('otra pestaña solo renueva la misma sesión: se queda el usuario', () => {
    const store = create();
    store.signIn({ expiresIn: 900, refreshExpiresIn: 3600, user: RIDER });
    const renewed = JSON.stringify({ userId: 'u1', expiresAt: Date.now() + 7200_000 });

    window.dispatchEvent(new StorageEvent('storage', { key: SESSION_KEY, newValue: renewed }));
    expect(store.user()).toEqual(RIDER);
  });

  it('clear lo olvida todo', () => {
    const store = create();
    store.signIn({ expiresIn: 900, refreshExpiresIn: 3600, user: RIDER });
    store.clear();
    expect(store.hasSession()).toBeFalse();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
