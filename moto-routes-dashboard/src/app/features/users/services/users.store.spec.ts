import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthStore } from '../../../auth/auth.store';
import { fakeUser } from '../../../auth/testing/auth.testing';
import { User } from '../../../core/models/user.model';
import { UsersStore } from './users.store';

const OTHER: User = { ...fakeUser('rider'), _id: '2', name: 'Luis', slug: 'luis' };

describe('UsersStore: tu propia cuenta', () => {
  let store: UsersStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    spyOn(localStorage, 'removeItem').and.stub();
    TestBed.inject(AuthStore).setUser(fakeUser());
    store = TestBed.inject(UsersStore);
  });

  it('reconoce la cuenta de la sesión', () => {
    expect(store.isSelf(fakeUser())).toBeTrue();
    expect(store.isSelf(OTHER)).toBeFalse();
  });

  it('no deja desactivar ni eliminar tu propia cuenta, y explica por qué', () => {
    expect(store.toggleLockedReason(fakeUser())).toBe('No puedes desactivar tu propia cuenta.');
    expect(store.deleteLockedReason(fakeUser())).toBe('No puedes eliminar tu propia cuenta.');
  });

  it('las cuentas de los demás no tienen bloqueo', () => {
    expect(store.toggleLockedReason(OTHER)).toBeNull();
    expect(store.deleteLockedReason(OTHER)).toBeNull();
  });
});

describe('UsersStore: el menú se pone al día al editarte a ti mismo', () => {
  let store: UsersStore;
  let http: HttpTestingController;

  /** Deja que las promesas pendientes lleguen a lanzar su petición. */
  const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));
  const meRequests = (): number => http.match((request) => request.url.endsWith('/auth/me')).length;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    spyOn(localStorage, 'setItem').and.stub();
    spyOn(localStorage, 'removeItem').and.stub();
    TestBed.inject(AuthStore).login({ expiresIn: 3600, user: fakeUser() });
    store = TestBed.inject(UsersStore);
    http = TestBed.inject(HttpTestingController);
  });

  it('guardar tu propia cuenta vuelve a pedir el usuario de la sesión', async () => {
    const saving = store.update('1', { name: 'Ana María' });
    http.expectOne((request) => request.method === 'PATCH').flush({ ...fakeUser(), name: 'Ana María' });
    await saving;
    await tick();

    expect(meRequests()).toBe(1);
  });

  it('guardar la cuenta de otro no toca la sesión', async () => {
    const saving = store.update('2', { name: 'Luis Gil' });
    http.expectOne((request) => request.method === 'PATCH').flush({ ...OTHER, name: 'Luis Gil' });
    await saving;
    await tick();

    expect(meRequests()).toBe(0);
  });

  it('cambiar la foto de tu cuenta (refreshSelected) también pone al día el avatar', async () => {
    const opening = store.getBySlug('ana');
    http.expectOne((request) => request.method === 'GET').flush(fakeUser());
    await opening;

    const refreshing = store.refreshSelected();
    http.expectOne((request) => request.method === 'GET' && !request.url.endsWith('/auth/me')).flush(fakeUser());
    await refreshing;
    await tick();

    expect(meRequests()).toBe(1);
  });
});
