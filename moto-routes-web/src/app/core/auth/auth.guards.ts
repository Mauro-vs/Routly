import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService, LOGIN_PATH } from './auth.service';
import { AuthStore } from './auth.store';

/**
 * Solo con sesión (Mi cuenta). Si hay una guardada sin confirmar, se espera a auth antes de
 * decidir. Sin sesión, al login con la vuelta en `?volver=`.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const store = inject(AuthStore);
  const router = inject(Router);

  await inject(AuthService).restore();
  if (store.isLoggedIn()) return true;
  return router.createUrlTree([LOGIN_PATH], { queryParams: { volver: state.url } });
};

/** Solo sin sesión (entrar y registrarse): con sesión no tiene sentido, a Mi cuenta. */
export const guestGuard: CanActivateFn = async () => {
  // inject() solo antes del primer await: después ya no hay contexto de inyección
  const store = inject(AuthStore);
  const router = inject(Router);

  await inject(AuthService).restore();
  return store.isLoggedIn() ? router.createUrlTree(['/mi-cuenta']) : true;
};

/** La vuelta tras entrar: solo rutas propias (`/...`), nunca otra web (`//evil.com`). */
export function safeReturnUrl(value: string | null | undefined): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/mi-cuenta';
}
