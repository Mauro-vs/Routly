import { loadCookieConfig } from "../config/cookies.js";

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
