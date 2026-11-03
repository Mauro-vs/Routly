import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthStore } from '../../../auth/auth.store';
import { fakeUser } from '../../../auth/auth.testing';
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
