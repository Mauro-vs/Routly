import { Injectable, computed, signal } from '@angular/core';

import { AuthUser } from '../models/auth-user.model';

/**
 * Sesión del usuario. La API todavía no tiene autenticación, así que este servicio
 * solo deja preparado el estado que leen el authInterceptor y el authGuard.
 *
 * Cuando exista: aquí irán el inicio y el cierre de sesión, que rellenarán
 * `currentUser` y `token`. El resto del panel no tendrá que cambiar.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser = signal<AuthUser | null>(null);
  private readonly _token = signal<string | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
}
