/*
 * Cómo se pone la cookie de sesión (utils/session-cookie.js). Se lee al usarse, como
 * config/auth.js: server.js la carga al arrancar (y no arranca si algo está mal) y los
 * tests pueden fijar las variables antes.
 *
 *   COOKIE_SECURE    true | false. Sin definir: true en producción, false fuera
 *   COOKIE_SAMESITE  strict (por defecto) | lax
 */
const BASE_NAME = "routly_session";
const SAME_SITE = ["strict", "lax"];

let config;

/** Lee y comprueba la configuración de la cookie a partir de unas variables de entorno. */
export function cookieConfigFrom(env = process.env) {
  const rawSecure = env.COOKIE_SECURE?.trim().toLowerCase();
  let secure;
  if (!rawSecure) secure = env.NODE_ENV === "production";
  else if (rawSecure === "true" || rawSecure === "false") secure = rawSecure === "true";
  else throw new Error(`COOKIE_SECURE has an invalid value: "${env.COOKIE_SECURE}" (use true or false)`);

  const sameSite = env.COOKIE_SAMESITE?.trim().toLowerCase() || "strict";
  if (sameSite === "none") {
    // Con SameSite=None el navegador manda la cookie desde cualquier web: haría falta un
    // token CSRF, y la API no lo tiene
    throw new Error("COOKIE_SAMESITE=none is not supported: it needs a CSRF token (use strict or lax)");
  }
  if (!SAME_SITE.includes(sameSite)) {
    throw new Error(`COOKIE_SAMESITE has an invalid value: "${env.COOKIE_SAMESITE}" (use strict or lax)`);
  }

  // __Secure-: el navegador solo acepta la cookie si llega por HTTPS y con Secure, así nadie
  // la puede colar por HTTP. (__Host- obligaría a Path=/, y esta va en Path=/api.)
  const name = secure ? `__Secure-${BASE_NAME}` : BASE_NAME;
  return Object.freeze({ name, secure, sameSite });
}

/** La configuración del proceso, leída una vez. */
export function loadCookieConfig() {
  config ??= cookieConfigFrom();
  return config;
}
