/*
 * Las dos cookies de la sesión, las dos httpOnly (el JavaScript de la página no las lee, así que
 * un XSS no se las lleva) y SameSite strict por defecto:
 *
 *   routly_session  el token de acceso (15 min). Path=/: llega a /api, /ai y /auth desde el
 *                   mismo origen (el proxy de Angular hoy, la gateway mañana)
 *   routly_refresh  el refresh (7 d). Path=/auth: solo lo ve este servicio
 *
 * Con Secure (producción) se llaman __Secure-routly_session y __Secure-routly_refresh: el
 * navegador solo las acepta por HTTPS, así nadie las puede colar por HTTP.
 */
const SESSION = "routly_session";
const REFRESH = "routly_refresh";
// La cookie de antes, que ponía la API en Path=/api. Si siguiera viva, el navegador mandaría
// las dos a /api (la vieja primero) y la API leería la que ya no vale
const LEGACY_SESSION_PATH = "/api";
export const REFRESH_PATH = "/auth";

export function cookieNames({ secure }) {
  const prefix = secure ? "__Secure-" : "";
  return { session: `${prefix}${SESSION}`, refresh: `${prefix}${REFRESH}` };
}

const baseOptions = ({ secure, sameSite }) => ({ httpOnly: true, secure, sameSite });

/** Pone las dos cookies de una sesión recién abierta o renovada. Las duraciones, en segundos. */
export function setSessionCookies(res, cookieConfig, { accessToken, accessTtl, refreshToken, refreshTtl }) {
  const names = cookieNames(cookieConfig);
  const options = baseOptions(cookieConfig);
  res.cookie(names.session, accessToken, { ...options, path: "/", maxAge: accessTtl * 1000 });
  res.cookie(names.refresh, refreshToken, { ...options, path: REFRESH_PATH, maxAge: refreshTtl * 1000 });
  clearLegacyCookie(res, cookieConfig);
}

/** Borra las dos (logout): el navegador las descarta al recibirlas caducadas, con las mismas opciones. */
export function clearSessionCookies(res, cookieConfig) {
  const names = cookieNames(cookieConfig);
  const options = baseOptions(cookieConfig);
  res.clearCookie(names.session, { ...options, path: "/" });
  res.clearCookie(names.refresh, { ...options, path: REFRESH_PATH });
  clearLegacyCookie(res, cookieConfig);
}

function clearLegacyCookie(res, cookieConfig) {
  res.clearCookie(cookieNames(cookieConfig).session, { ...baseOptions(cookieConfig), path: LEGACY_SESSION_PATH });
}

/** Lee una cookie de la cabecera Cookie ("a=1; b=2"). La primera con ese nombre. */
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
