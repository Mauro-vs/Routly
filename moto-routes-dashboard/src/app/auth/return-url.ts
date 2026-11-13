import { Params } from '@angular/router';

export const LOGIN_PATH = '/login';

/** Los parámetros de `/login` para volver después a `url`. A la portada se vuelve sin más. */
export function returnUrlParams(url: string): Params {
  return url === '/' ? {} : { returnUrl: url };
}

/**
 * Adónde ir tras el login. `returnUrl` llega en la URL y cualquiera puede escribirla, así que
 * solo vale una ruta interna: `//otra-web.com` o `/\otra-web.com` llevarían fuera del panel.
 */
export function safeReturnUrl(value: string | null | undefined): string {
  const internal = !!value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
  return internal && !value.startsWith(LOGIN_PATH) ? value : '/';
}
