import { CanActivateFn } from '@angular/router';

/**
 * Protege las rutas del panel. Mientras la API no tenga autenticación deja pasar
 * siempre. Cuando exista, bastará con cambiar el cuerpo por:
 *
 *   return inject(AuthService).isAuthenticated() || inject(Router).createUrlTree(['/login']);
 */
export const authGuard: CanActivateFn = () => true;
