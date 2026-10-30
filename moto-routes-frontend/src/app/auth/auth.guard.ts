import { CanActivateFn } from '@angular/router';

/**
 * Protege las rutas del panel. Sigue dejando pasar hasta la fase de rutas: sin la página de
 * login, activarlo dejaría el panel sin entrada.
 */
export const authGuard: CanActivateFn = () => true;
