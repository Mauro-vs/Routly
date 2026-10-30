import { Injectable, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';

import { FORCED_NAVIGATION } from '../core/guards/unsaved-changes.guard';
import { ApiError } from '../core/models/api-error.model';
import { ApiStatusService } from '../core/services/api-status.service';
import { NotificationService } from '../core/services/notification.service';
import { SessionResetService } from '../core/services/session-reset.service';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';
import { LOGIN_PATH, returnUrlParams } from './return-url';

const EXPIRED_MESSAGE = 'Tu sesión ha caducado. Inicia sesión de nuevo.';
const REJECTED_MESSAGE = 'Tu sesión ya no es válida. Inicia sesión de nuevo.';

/**
 * Lo que pasa en pantalla cuando una sesión termina sin que nadie la cierre: avisar y volver
 * al login. Es el reparto que AuthService no puede hacer, porque no toca la interfaz.
 *
 * Termine por lo que termine (un 401, la hora de `exp` u otra pestaña), pasa por aquí una
 * sola vez, aunque fallen varias peticiones a la vez.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly store = inject(AuthStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly resets = inject(SessionResetService);
  private readonly apiStatus = inject(ApiStatusService);

  constructor() {
    // La sesión se cierra sola a la hora de `exp`.
    effect((onCleanup) => {
      const expiresAt = this.store.expiresAt();
      if (expiresAt === null) return;

      // setTimeout solo admite 32 bits: un plazo mayor se dispara al momento.
      const delay = Math.min(expiresAt - Date.now(), 2 ** 31 - 1);
      const timer = setTimeout(() => {
        if (Date.now() >= expiresAt) this.leave(EXPIRED_MESSAGE);
      }, delay);
      onCleanup(() => clearTimeout(timer));
    });

    // Otra pestaña ha cerrado o cambiado la sesión.
    effect(() => {
      if (this.store.foreignChanges() === 0) return;
      untracked(() => {
        this.resets.resetAll();
        if (this.store.token()) void this.recheck();
        else void this.toLogin();
      });
    });

    // Se arrancó sin conexión: en cuanto vuelve la API, se confirma el token.
    effect(() => {
      if (this.store.unverified() && this.apiStatus.status() === 'online') {
        untracked(() => void this.recheck());
      }
    });
  }

  /** La API ha rechazado el token, o ya ha caducado. */
  reject(error: ApiError): void {
    this.leave(error.code === 'TOKEN_EXPIRED' ? EXPIRED_MESSAGE : REJECTED_MESSAGE);
  }

  /**
   * Vuelve a pedir el usuario, por ejemplo tras un 403 inesperado: si le han cambiado el rol
   * con la sesión abierta, el menú y las rutas se ponen al día sin volver a entrar.
   */
  async recheck(): Promise<void> {
    if (!this.store.token()) return;

    const couldEnterPanel = this.store.isAdmin() || this.store.unverified();
    await this.auth.loadSession();

    // loadSession ya ha limpiado la sesión si la API la ha rechazado: falta decirlo.
    if (!this.store.token()) this.notifyAndLeave(REJECTED_MESSAGE);
    else if (couldEnterPanel && this.store.user() && !this.store.isAdmin()) void this.leavePanel();
  }

  /** Cierra la sesión desde un botón: a diferencia de cuando caduca, no hay nada que avisar. */
  async logout(everywhere = false): Promise<void> {
    await (everywhere ? this.auth.logoutAll() : this.auth.logout());
    await this.router.navigateByUrl(LOGIN_PATH, { info: FORCED_NAVIGATION });
  }

  /** Ya no es administrador, o nunca lo fue: fuera del panel, salvo si está en su zona. */
  private leavePanel(): Promise<boolean> {
    const url = this.router.url;
    if (url.startsWith('/profile') || url === '/forbidden') return Promise.resolve(true);
    return this.router.navigate(['/forbidden'], { info: FORCED_NAVIGATION });
  }

  private leave(message: string): void {
    if (!this.store.token()) return;
    this.auth.clearSession();
    this.notifyAndLeave(message);
  }

  private notifyAndLeave(message: string): void {
    void this.notifications.warning(message);
    void this.toLogin();
  }

  /** Forzada: un formulario a medias no puede retener a una sesión que ya no sirve. */
  private toLogin(): Promise<boolean> {
    const url = this.router.url;
    if (url.startsWith(LOGIN_PATH)) return Promise.resolve(true);

    return this.router.navigate([LOGIN_PATH], {
      queryParams: returnUrlParams(url),
      info: FORCED_NAVIGATION,
    });
  }
}
