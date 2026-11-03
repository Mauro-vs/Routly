import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { ADMIN_ROLE, AccessRole, AuthResponse, AuthUser, Session } from './auth.models';

const SESSION_KEY = 'routly.session';

/** La sesión guardada, si sigue vigente. Un `expiresAt` que no es un número o ya pasó se descarta. */
function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const { expiresAt } = JSON.parse(raw) as { expiresAt?: unknown };
    return typeof expiresAt === 'number' && expiresAt > Date.now() ? { expiresAt } : null;
  } catch {
    return null;
  }
}

function readSession(): Session | null {
  try {
    return parseSession(localStorage.getItem(SESSION_KEY));
  } catch {
    // Sin almacenamiento (modo privado...), la sesión dura lo que dure la pestaña.
    return null;
  }
}

function writeSession(session: Session | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Sin almacenamiento, solo se pierde el recuerdo.
  }
}

/**
 * Estado de la sesión, con signals. Solo guarda y cuenta: no llama a la API ni navega.
 *
 * El token no pasa por aquí: vive en la cookie httpOnly que pone la API y el navegador la
 * manda sola. El panel solo sabe si hay sesión y cuándo caduca.
 *
 * El rol sale siempre de `user`, que viene de la API, y nunca del token: la API lo lee de
 * la base de datos, así que el del token puede haberse quedado viejo.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _user = signal<AuthUser | null>(null);
  private readonly _session = signal<Session | null>(readSession());
  private readonly _foreignChanges = signal(0);

  readonly user = this._user.asReadonly();
  readonly expiresAt = computed(() => this._session()?.expiresAt ?? null);
  readonly isAuthenticated = computed(() => this._session() !== null);
  /** Hay sesión, pero la API aún no la ha confirmado: por ejemplo, arrancó sin conexión. */
  readonly unverified = computed(() => this._session() !== null && this._user() === null);
  readonly isAdmin = computed(() => this.hasRole('ADMIN'));

  /** El rol de la API y su nivel de acceso: `['admin', 'ADMIN']` o `['rider', 'USER']`. */
  readonly roles = computed<readonly string[]>(() => {
    const name = this._user()?.role.name;
    if (!name) return [];
    const access: AccessRole = name === ADMIN_ROLE ? 'ADMIN' : 'USER';
    return [name, access];
  });

  /** Cuenta los cambios de sesión hechos en otra pestaña. Lo vigila SessionService. */
  readonly foreignChanges = this._foreignChanges.asReadonly();

  constructor() {
    // Una versión anterior del panel guardaba aquí el token: se reescribe sin él.
    writeSession(this._session());

    const onStorage = (event: StorageEvent): void => {
      if (event.key !== SESSION_KEY && event.key !== null) return;
      this._session.set(parseSession(event.newValue));
      this._user.set(null);
      this._foreignChanges.update((count) => count + 1);
    };
    window.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', onStorage));
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  /**
   * Guarda una sesión nueva, que caduca dentro de `expiresIn` segundos. Devuelve false si
   * ese plazo no sirve, y entonces no guarda nada.
   */
  login({ expiresIn, user }: Pick<AuthResponse, 'expiresIn' | 'user'>): boolean {
    if (!Number.isFinite(expiresIn) || expiresIn <= 0) return false;

    const session = { expiresAt: Date.now() + expiresIn * 1000 };
    this._session.set(session);
    this._user.set(user);
    writeSession(session);
    return true;
  }

  /** Pone al día el usuario sin tocar la sesión. */
  setUser(user: AuthUser): void {
    this._user.set(user);
  }

  logout(): void {
    this._session.set(null);
    this._user.set(null);
    writeSession(null);
  }
}
