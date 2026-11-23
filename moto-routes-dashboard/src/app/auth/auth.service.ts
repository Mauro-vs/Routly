import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../environments/environment';
import { REQUEST_TIMEOUT } from '../core/interceptors/timeout.interceptor';
import { ApiService } from '../core/services/api.service';
import { SessionResetService } from '../core/services/session-reset.service';
import { invalidResponseError, toApiError } from '../core/utils/api-error.mapper';
import { SKIP_SESSION_HANDLING } from './auth.interceptor';
import { AuthUser, LoginRequest, RegisterRequest, SessionResponse } from './auth.models';
import { AuthStore } from './auth.store';

/** Espera máxima al arrancar o al salir: si la API no responde, no se hace esperar a nadie. */
const SESSION_TIMEOUT = 3000;

/** El servicio de auth (login, refresh, logout, contraseña). El usuario sale de la API. */
const AUTH = environment.authUrl;
const ME = '/profile/me';

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

/** Lo que importa de la respuesta de auth: hasta cuándo se puede renovar y de quién es. */
export function isSessionResponse(value: unknown): value is SessionResponse {
  return (
    isRecord(value) &&
    typeof value['refreshExpiresIn'] === 'number' &&
    value['refreshExpiresIn'] > 0 &&
    isRecord(value['user']) &&
    typeof value['user']['id'] === 'string'
  );
}

/** Se arregla renovando: TOKEN_EXPIRED, o un 401 sin code porque el navegador ya ha tirado la cookie del token. */
const isRenewable = (error: unknown): boolean => toApiError(error).isRenewable;

/**
 * Comunicación con el servicio de auth. La sesión son las cookies httpOnly que pone auth: aquí
 * solo se sincroniza AuthStore, y es el único punto por el que se cierra una sesión.
 *
 * El token de acceso dura 15 minutos. Cuando caduca, `refresh()` pide otro con la cookie de
 * refresh, que se renueva con él (dura 7 días desde la última renovación).
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
  private refreshing: Promise<boolean> | null = null;

  login(credentials: LoginRequest): Promise<AuthUser> {
    return this.authenticate(`${AUTH}/login`, credentials);
  }

  register(data: RegisterRequest): Promise<AuthUser> {
    return this.authenticate(`${AUTH}/register`, data);
  }

  /**
   * Comprueba con la API la sesión (la cookie) y trae el usuario. Devuelve true si sirve.
   * Sin sesión guardada, o ya caducada, no se pregunta: se entra como anónimo. Si el token de
   * acceso ha caducado (lo normal al volver al día siguiente), se renueva una vez. Un 401 la
   * cierra; un fallo de red no, porque no dice nada de las cookies. Varias llamadas a la vez
   * comparten la misma petición.
   */
  loadSession(): Promise<boolean> {
    if (!this.store.isAuthenticated()) return Promise.resolve(false);
    this.verifying ??= this.verify().finally(() => (this.verifying = null));
    return this.verifying;
  }

  /**
   * Pide un token de acceso nuevo con la cookie de refresh. Devuelve true si lo hay; false si
   * auth rechaza la sesión, que entonces se cierra aquí. Sin red, rechaza la promesa y la
   * sesión sigue: no dice nada de las cookies. Varias llamadas a la vez comparten la petición,
   * porque un refresh ya usado no vuelve a servir.
   */
  refresh(): Promise<boolean> {
    if (!this.store.isAuthenticated()) return Promise.resolve(false);
    this.refreshing ??= this.renew().finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  /**
   * Vuelve a pedir el usuario de la sesión, para que el menú enseñe al momento lo que ha
   * cambiado (la foto, el nombre) sin recargar. Es una puesta al día de fondo: si falla, se
   * queda lo que había y no se avisa. Un 401 lo gestiona el errorInterceptor, como siempre.
   */
  async refreshUser(): Promise<void> {
    if (!this.store.isAuthenticated()) return;
    try {
      const user = await this.api.get<unknown>(ME);
      if (isAuthUser(user)) this.store.setUser(user);
    } catch {
      // Se mantiene el usuario que había.
    }
  }

  /** Cierra esta sesión en auth (que borra las cookies) y, pase lo que pase, en el panel. */
  logout(): Promise<void> {
    return this.signOut(`${AUTH}/logout`);
  }

  /**
   * Cierra todas las sesiones del usuario, en todos sus dispositivos. Auth lo pide con un
   * token de acceso vigente: si ha caducado, se renueva antes.
   */
  logoutAll(): Promise<void> {
    return this.signOut(`${AUTH}/logout-all`, true);
  }

  /** Olvida la sesión y los datos del panel, para que el siguiente no vea los del anterior. */
  clearSession(): void {
    this.store.logout();
    this.resets.resetAll();
  }

  /** Abre la sesión en auth y trae de la API el usuario completo, con su rol y su perfil. */
  private async authenticate(path: string, body: unknown): Promise<AuthUser> {
    const response = await this.api.post<unknown>(path, body, { context: sessionContext() });
    if (!isSessionResponse(response)) throw invalidResponseError();

    const user = await this.api.get<unknown>(ME, { context: sessionContext() });
    if (!isAuthUser(user) || user._id !== response.user.id) throw invalidResponseError();
    if (!this.store.login({ expiresIn: response.refreshExpiresIn, user })) throw invalidResponseError();
    return user;
  }

  private async verify(): Promise<boolean> {
    try {
      return this.keep(await this.fetchMe());
    } catch (error) {
      if (!isRenewable(error)) {
        if (toApiError(error).isUnauthorized) this.clearSession();
        return false;
      }
    }
    // El token de acceso ha caducado (o su cookie ya no está): se renueva y se pregunta otra vez.
    try {
      if (!(await this.refresh())) return false;
      return this.keep(await this.fetchMe());
    } catch (error) {
      if (toApiError(error).isUnauthorized) this.clearSession();
      return false;
    }
  }

  private fetchMe(): Promise<unknown> {
    return this.api.get<unknown>(ME, { context: sessionContext() });
  }

  private keep(user: unknown): boolean {
    if (!isAuthUser(user)) return false;
    this.store.setUser(user);
    return true;
  }

  private async renew(): Promise<boolean> {
    try {
      const response = await this.api.post<unknown>(`${AUTH}/refresh`, null, { context: sessionContext() });
      if (isSessionResponse(response) && this.store.extend(response.refreshExpiresIn)) return true;
    } catch (error) {
      if (!toApiError(error).isUnauthorized) throw error;
    }
    this.clearSession();
    return false;
  }

  private async signOut(path: string, needsAccess = false): Promise<void> {
    const send = (): Promise<null> => this.api.post<null>(path, null, { context: sessionContext() });
    try {
      try {
        await send();
      } catch (error) {
        if (needsAccess && isRenewable(error) && (await this.refresh())) await send();
      }
    } catch {
      // Sin red o con la sesión caducada, se cierra igual en el panel.
    } finally {
      this.clearSession();
    }
  }
}
