/*
 * La cookie de sesión que pone el servicio de auth. La API no pone cookies: solo tiene que saber
 * cómo se llama y leerla (sessionCookieName y readCookie, abajo). Se lee al usarse, como config/auth.js.
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

/*
 * La sesión del panel viaja en una cookie httpOnly que pone y borra el servicio de auth
 * (moto-routes-auth): routly_session, con Path=/ para que llegue a /api, /ai y /auth. La API
 * solo la lee. Con Secure (producción) se llama __Secure-routly_session (config/cookies.js).
 */

/** El nombre de la cookie: routly_session, o __Secure-routly_session con Secure. */
export const sessionCookieName = () => loadCookieConfig().name;

/** Lee una cookie de la cabecera Cookie ("a=1; b=2"). Sin cookie-parser: no hace falta más. */
export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}
