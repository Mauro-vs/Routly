/*
 * La sesión del panel viaja en una cookie httpOnly: el JavaScript de la página no la puede
 * leer, así que un XSS no se lleva el token. El token sigue saliendo también en el body del
 * login para Swagger, Postman y los tests, que mandan Authorization: Bearer.
 *
 * SameSite=Strict: el navegador no la manda en peticiones que vienen de otra web (CSRF).
 * Path=/api: solo viaja a la API. Secure solo en producción: en http://localhost algunos
 * navegadores no guardan una cookie Secure.
 */
export const SESSION_COOKIE = "routly_session";

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "strict",
  path: "/api",
  secure: process.env.NODE_ENV === "production",
});

/** Pone la cookie con el token de la sesión. maxAge en segundos, como el expiresIn del login. */
export function setSessionCookie(res, token, maxAge) {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: maxAge * 1000 });
}

/** La borra: el navegador la descarta al recibirla caducada, con las mismas opciones. */
export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

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

/** Responde con la sesión (login, registro, cambio de contraseña) y deja puesta la cookie. */
export function sendSession(res, session, status = 200) {
  setSessionCookie(res, session.token, session.expiresIn);
  res.status(status).json(session);
}
