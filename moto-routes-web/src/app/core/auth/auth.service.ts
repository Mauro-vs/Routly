import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse } from '@angular/common/http';
import { Injectable, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuthUser,
  LoginRequest,
  RegisterRequest,
  isAuthUser,
  isSessionResponse,
} from './auth.models';
import { AuthStore } from './auth.store';

const AUTH = environment.authUrl;

/** Las rutas que solo ve un cliente con sesión: si la sesión termina estando en ellas, al login. */
const PRIVATE_PATHS = ['/mi-cuenta'];
const isPrivate = (url: string): boolean => PRIVATE_PATHS.some((path) => url.startsWith(path));
export const LOGIN_PATH = '/entrar';

/**
 * Peticiones que deciden por su cuenta qué significa un 401: un login fallido no es una sesión
 * caducada, y el propio refresh no se puede renovar con otro refresh. El authInterceptor las deja pasar.
 */
export const SKIP_REFRESH = new HttpContextToken<boolean>(() => false);
const ownHandling = (): HttpContext => new HttpContext().set(SKIP_REFRESH, true);

/** El error de una respuesta que no es lo que se esperaba de auth. */
export class InvalidSessionResponse extends Error {}

const isUnauthorized = (error: unknown): boolean =>
  error instanceof HttpErrorResponse && error.status === 401;

/**
 * La sesión del cliente contra el servicio de auth (moto-routes-auth, /auth).
 *
 *   login / register  abren la sesión: auth deja las dos cookies httpOnly
 *   restore           al arrancar (o si otra pestaña cambia de cliente): GET /auth/me
 *   refresh           pide un token de acceso nuevo con la cookie de refresh (lo usa el interceptor)
 *   logout            cierra esta sesión; logoutAll, todas las del cliente
 *
 * Todas las peticiones van con `withCredentials: true` (lo pone el authInterceptor) para que el
 * navegador mande las cookies.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  private restoring: Promise<void> | null = null;
  private signingOut = false;
  private refreshing: Promise<boolean> | null = null;

  constructor() {
    // Hay sesión guardada pero aún no se sabe de quién (al arrancar, u otra pestaña ha entrado
    // con otro cliente): se pregunta a auth
    effect(() => {
      if (this.store.hasSession() && !this.store.isLoggedIn()) untracked(() => void this.restore());
    });

    // La sesión ha terminado (caducada, rechazada o cerrada en otra pestaña) estando en una
    // página privada: al login, con la vuelta. Un logout desde un botón ya navega por su cuenta
    effect(() => {
      if (this.store.hasSession() || this.signingOut) return;
      const url = untracked(() => this.router.url);
      if (isPrivate(url)) untracked(() => void this.router.navigate([LOGIN_PATH], { queryParams: { volver: url } }));
    });
  }

  login(credentials: LoginRequest): Promise<AuthUser> {
    return this.open(`${AUTH}/login`, credentials);
  }

  register(data: RegisterRequest): Promise<AuthUser> {
    return this.open(`${AUTH}/register`, data);
  }

  /**
   * Confirma la sesión guardada con GET /auth/me. Si el token de acceso ha caducado, el
   * interceptor lo renueva antes. Un 401 cierra la sesión; un fallo de red no (no dice nada de
   * las cookies). Si ya está confirmada no pregunta. Varias llamadas a la vez comparten la petición.
   */
  restore(): Promise<void> {
    if (!this.store.hasSession() || this.store.isLoggedIn()) return Promise.resolve();
    this.restoring ??= this.loadUser().finally(() => (this.restoring = null));
    return this.restoring;
  }

  /**
   * Renueva la sesión con la cookie de refresh. true si hay token de acceso nuevo; false si
   * auth la rechaza, y entonces se cierra. Sin red, rechaza la promesa y la sesión sigue.
   *
   * Varias peticiones que caducan a la vez esperan al mismo refresh: cada refresh solo se puede
   * usar una vez, y un segundo uso lo tomaría auth por un robo.
   */
  refresh(): Promise<boolean> {
    if (!this.store.hasSession()) return Promise.resolve(false);
    this.refreshing ??= this.renew().finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  /**
   * Cierra esta sesión en auth (borra las cookies y revoca el refresh) y, pase lo que pase, aquí.
   * Las demás pestañas se enteran por localStorage. Si estaba en una página privada, al inicio.
   */
  logout(): Promise<void> {
    return this.signOut(`${AUTH}/logout`, ownHandling());
  }

  /**
   * Cierra todas las sesiones del cliente, en todos sus dispositivos. Necesita un token de
   * acceso vigente: si ha caducado, el interceptor lo renueva antes.
   */
  logoutAll(): Promise<void> {
    return this.signOut(`${AUTH}/logout-all`);
  }

  /** La sesión ya no sirve: se olvida. Si estaba en una página privada, el effect lleva al login. */
  end(): void {
    this.store.clear();
  }

  private async signOut(path: string, context?: HttpContext): Promise<void> {
    this.signingOut = true;
    try {
      await firstValueFrom(this.http.post(path, null, { context }));
    } catch {
      // Sin red o ya caducada: se sale igual
    }
    this.store.clear();
    try {
      if (isPrivate(this.router.url)) await this.router.navigateByUrl('/');
    } finally {
      this.signingOut = false;
    }
  }

  private async open(path: string, body: unknown): Promise<AuthUser> {
    const response = await firstValueFrom(this.http.post<unknown>(path, body, { context: ownHandling() }));
    if (!isSessionResponse(response)) throw new InvalidSessionResponse();
    this.store.signIn(response);
    return response.user;
  }

  private async loadUser(): Promise<void> {
    try {
      const user = await firstValueFrom(this.http.get<unknown>(`${AUTH}/me`));
      if (isAuthUser(user)) this.store.setUser(user);
    } catch (error) {
      if (isUnauthorized(error)) this.end();
    }
  }

  private async renew(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<unknown>(`${AUTH}/refresh`, null, { context: ownHandling() }),
      );
      if (isSessionResponse(response)) {
        this.store.extend(response.refreshExpiresIn);
        this.store.setUser(response.user);
        return true;
      }
    } catch (error) {
      if (!isUnauthorized(error)) throw error;
    }
    this.end();
    return false;
  }
}
