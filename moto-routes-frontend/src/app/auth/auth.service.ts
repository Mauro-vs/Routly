import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { REQUEST_TIMEOUT } from '../core/interceptors/timeout.interceptor';
import { ApiService } from '../core/services/api.service';
import { SessionResetService } from '../core/services/session-reset.service';
import { invalidResponseError, toApiError } from '../core/utils/api-error.mapper';
import { SKIP_SESSION_HANDLING } from './auth.interceptor';
import { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from './auth.models';
import { AuthStore } from './auth.store';

/** Espera máxima al arrancar o al salir: si la API no responde, no se hace esperar a nadie. */
const SESSION_TIMEOUT = 3000;

// Estas llamadas deciden por su cuenta qué significa un 401: un login fallido no cierra
// ninguna sesión, y un logout con el token ya caducado sigue siendo un logout.
const sessionContext = (): HttpContext =>
  new HttpContext().set(SKIP_SESSION_HANDLING, true).set(REQUEST_TIMEOUT, SESSION_TIMEOUT);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    typeof value['_id'] === 'string' &&
    isRecord(value['role']) &&
    typeof value['role']['name'] === 'string'
  );
}

function isAuthResponse(value: unknown): value is AuthResponse {
  return (
    isRecord(value) &&
    typeof value['expiresIn'] === 'number' &&
    value['expiresIn'] > 0 &&
    isAuthUser(value['user'])
  );
}

/**
 * Comunicación con la API de autenticación. La sesión es la cookie httpOnly que pone la
 * API: aquí solo se sincroniza AuthStore, y es el único punto por el que se cierra una sesión.
 *
 * No toca la interfaz: ni Router, ni avisos. Lo que hay que enseñar y adónde ir lo deciden
 * las páginas, los guards y SessionService.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly store = inject(AuthStore);
  private readonly resets = inject(SessionResetService);

  private verifying: Promise<boolean> | null = null;

  login(credentials: LoginRequest): Promise<AuthUser> {
    return this.authenticate('/auth/login', credentials);
  }

  register(data: RegisterRequest): Promise<AuthUser> {
    return this.authenticate('/auth/register', data);
  }

  /**
   * Comprueba con la API la sesión (la cookie) y trae el usuario. Devuelve true si sirve.
   * Sin sesión guardada, o ya caducada, no se pregunta: se entra como anónimo. Un 401 la
   * cierra; un fallo de red no, porque no dice nada de la cookie. Varias
   * llamadas a la vez comparten la misma petición.
   */
  loadSession(): Promise<boolean> {
    if (!this.store.isAuthenticated()) return Promise.resolve(false);
    this.verifying ??= this.verify().finally(() => (this.verifying = null));
    return this.verifying;
  }

  /** Cierra esta sesión en la API (que borra la cookie) y, pase lo que pase, en el panel. */
  logout(): Promise<void> {
    return this.signOut('/auth/logout');
  }

  /** Cierra todas las sesiones del usuario, en todos sus dispositivos. */
  logoutAll(): Promise<void> {
    return this.signOut('/auth/logout-all');
  }

  /** Olvida la sesión y los datos del panel, para que el siguiente no vea los del anterior. */
  clearSession(): void {
    this.store.logout();
    this.resets.resetAll();
  }

  private async authenticate(path: string, body: unknown): Promise<AuthUser> {
    const response = await this.api.post<unknown>(path, body, { context: sessionContext() });
    if (!isAuthResponse(response) || !this.store.login(response)) throw invalidResponseError();
    return response.user;
  }

  private async verify(): Promise<boolean> {
    try {
      const user = await this.api.get<unknown>('/auth/me', { context: sessionContext() });
      if (!isAuthUser(user)) return false;
      this.store.setUser(user);
      return true;
    } catch (error) {
      if (toApiError(error).isUnauthorized) this.clearSession();
      return false;
    }
  }

  private async signOut(path: string): Promise<void> {
    try {
      await this.api.post<null>(path, null, { context: sessionContext() });
    } catch {
      // Sin red o con la sesión caducada, se cierra igual en el panel.
    } finally {
      this.clearSession();
    }
  }
}
