import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from './auth.store';

/** El login y el registro son para quien no tiene sesión: con ella, se entra directamente. */
export const guestGuard: CanActivateFn = () =>
  inject(AuthStore).isAuthenticated() ? inject(Router).createUrlTree(['/']) : true;
