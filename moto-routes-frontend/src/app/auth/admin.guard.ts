import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from './auth.store';

/**
 * Deja pasar solo a ADMIN. En la portada, quien no lo es va a su zona; en cualquier otra
 * página del panel, a "Acceso denegado".
 *
 * Con la sesión sin confirmar (la API no respondía al arrancar) aún no se sabe el rol: se
 * deja pasar, y SessionService lo revisa cuando vuelve la conexión. Los datos los protege
 * la API.
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const store = inject(AuthStore);
  if (store.unverified() || store.isAdmin()) return true;
  return inject(Router).createUrlTree([state.url === '/' ? '/profile' : '/forbidden']);
};
