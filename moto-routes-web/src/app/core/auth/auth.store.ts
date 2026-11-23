import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { AuthUser, SessionResponse, StoredSession } from './auth.models';

/** Distinta de la del panel ('routly.session'): en el mismo navegador son dos sesiones aparte. */
export const SESSION_KEY = 'routly-web.session';

/** La sesión guardada, si sigue vigente. Cualquier cosa rara se descarta. */
export function parseSession(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const { userId, expiresAt } = JSON.parse(raw) as Partial<StoredSession>;
    const valid = typeof userId === 'string' && userId !== '' && typeof expiresAt === 'number';
    return valid && expiresAt > Date.now() ? { userId, expiresAt } : null;
  } catch {
    return null;
  }
}

function readSession(): StoredSession | null {
  try {
    return parseSession(localStorage.getItem(SESSION_KEY));
  } catch {
    // Sin almacenamiento (modo privado...), la sesión dura lo que la pestaña
    return null;
  }
}

function writeSession(session: StoredSession | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Sin almacenamiento, solo se pierde el recuerdo
  }
}

/**
 * El estado de la sesión del cliente, con signals. Solo guarda: no llama a nadie ni navega.
 *
 * Los tokens no pasan por aquí. El de acceso (15 min) y el refresh (7 días) viven en cookies
 * httpOnly que pone el servicio de auth, y el JavaScript de la página no las puede leer. Aquí
 * solo se sabe si hay sesión, de quién es y hasta cuándo se puede renovar.
 *
 * Esa pista se guarda en localStorage, así todas las pestañas comparten la sesión: entrar o
 * salir en una se ve al momento en las demás (el evento `storage`).
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _session = signal<StoredSession | null>(readSession());
  private readonly _user = signal<AuthUser | null>(null);

  readonly session = this._session.asReadonly();
  readonly user = this._user.asReadonly();
  /** Hay sesión (quizá aún sin confirmar con auth). */
  readonly hasSession = computed(() => this._session() !== null);
  /** Sesión confirmada: ya se sabe quién es. */
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'admin');
  readonly firstName = computed(() => this._user()?.name.split(' ')[0] ?? '');

  constructor() {
    const onStorage = (event: StorageEvent): void => {
      if (event.key !== SESSION_KEY && event.key !== null) return;
      const next = parseSession(event.newValue);
      // Otra pestaña ha renovado la misma sesión: solo cambia el plazo
      if (next && next.userId === this._session()?.userId) {
        this._session.set(next);
        return;
      }
      // Ha entrado otro cliente, o ha salido: el usuario se vuelve a pedir (o se olvida)
      this._session.set(next);
      this._user.set(null);
    };
    window.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', onStorage));
  }

  /** Sesión nueva (login o registro). */
  signIn({ refreshExpiresIn, user }: SessionResponse): void {
    this.save({ userId: user.id, expiresAt: Date.now() + refreshExpiresIn * 1000 });
    this._user.set(user);
  }

  /** La sesión se ha renovado con el refresh: mismo usuario, plazo nuevo. */
  extend(refreshExpiresIn: number): void {
    const current = this._session();
    if (current) this.save({ ...current, expiresAt: Date.now() + refreshExpiresIn * 1000 });
  }

  setUser(user: AuthUser): void {
    this._user.set(user);
  }

  clear(): void {
    this.save(null);
    this._user.set(null);
  }

  private save(session: StoredSession | null): void {
    this._session.set(session);
    writeSession(session);
  }
}
