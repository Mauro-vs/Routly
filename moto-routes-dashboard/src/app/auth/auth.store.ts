import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { ADMIN_ROLE, AccessRole, AuthUser, Session } from './auth.models';

const SESSION_KEY = 'routly.session';

const validLifetime = (seconds: number): boolean => Number.isFinite(seconds) && seconds > 0;

/**
 * La sesión guardada, si sigue vigente. Un `expiresAt` que no es un número o ya pasó, o sin
 * `userId` (las de antes del servicio de auth), se descarta.
 */
function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const { expiresAt, userId } = JSON.parse(raw) as { expiresAt?: unknown; userId?: unknown };
    const valid = typeof expiresAt === 'number' && expiresAt > Date.now();
    return valid && typeof userId === 'string' && userId ? { expiresAt, userId } : null;
  } catch {
    return null;
  }
}

/** La misma sesión, quizá renovada: el mismo usuario sigue dentro. */
function sameUser(a: Session | null, b: Session | null): boolean {
  return a !== null && b !== null && a.userId === b.userId;
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
 * Los tokens no pasan por aquí: viven en las cookies httpOnly que pone el servicio de auth y
 * el navegador las manda solas. El panel solo sabe si hay sesión, de quién y hasta cuándo se
 * puede renovar. El token de acceso dura 15 minutos y se renueva al recibir un TOKEN_EXPIRED.
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
    // Una versión anterior del panel guardaba aquí el token, o una sesión sin usuario: se
    // reescribe con lo que vale.
    writeSession(this._session());

    const onStorage = (event: StorageEvent): void => {
      if (event.key !== SESSION_KEY && event.key !== null) return;
      const next = parseSession(event.newValue);
      // Otra pestaña solo ha renovado la sesión: nada que recargar.
      if (sameUser(this._session(), next)) {
        this._session.set(next);
        return;
      }
      this._session.set(next);
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
   * Guarda una sesión nueva, que se puede renovar durante `expiresIn` segundos. Devuelve false
   * si ese plazo no sirve, y entonces no guarda nada.
   */
  login({ expiresIn, user }: { expiresIn: number; user: AuthUser }): boolean {
    if (!validLifetime(expiresIn)) return false;

    const session = { expiresAt: Date.now() + expiresIn * 1000, userId: user._id };
    this._session.set(session);
    this._user.set(user);
    writeSession(session);
    return true;
  }

  /**
   * La sesión se ha renovado (refresh o cambio de contraseña): mismo usuario, nuevo plazo.
   * Devuelve false si no hay sesión o el plazo no sirve.
   */
  extend(expiresIn: number): boolean {
    const current = this._session();
    if (!current || !validLifetime(expiresIn)) return false;

    const session = { ...current, expiresAt: Date.now() + expiresIn * 1000 };
    this._session.set(session);
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
