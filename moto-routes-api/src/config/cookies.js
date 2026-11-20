/*
 * El nombre de la cookie de sesión que pone el servicio de auth (utils/session-cookie.js). La API
 * no pone cookies: solo tiene que saber cómo se llama. Se lee al usarse, como config/auth.js.
 *
 *   COOKIE_SECURE  true | false. Sin definir: true en producción, false fuera. Tiene que ser el
 *                  mismo valor que en el servicio de auth
 */
const BASE_NAME = "routly_session";

let config;

/** Lee y comprueba la configuración de la cookie a partir de unas variables de entorno. */
export function cookieConfigFrom(env = process.env) {
  const rawSecure = env.COOKIE_SECURE?.trim().toLowerCase();
  let secure;
  if (!rawSecure) secure = env.NODE_ENV === "production";
  else if (rawSecure === "true" || rawSecure === "false") secure = rawSecure === "true";
  else throw new Error(`COOKIE_SECURE has an invalid value: "${env.COOKIE_SECURE}" (use true or false)`);

  // __Secure-: el navegador solo acepta la cookie si llega por HTTPS y con Secure
  const name = secure ? `__Secure-${BASE_NAME}` : BASE_NAME;
  return Object.freeze({ name, secure });
}

/** La configuración del proceso, leída una vez. */
export function loadCookieConfig() {
  config ??= cookieConfigFrom();
  return config;
}
