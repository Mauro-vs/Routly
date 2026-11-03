import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from './auth.store';
import { LOGIN_PATH, returnUrlParams } from './return-url';

/** Deja pasar solo con sesión. Sin ella, al login, recordando adónde se quería ir. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthStore).isAuthenticated()) return true;
  return inject(Router).createUrlTree([LOGIN_PATH], { queryParams: returnUrlParams(state.url) });
};
