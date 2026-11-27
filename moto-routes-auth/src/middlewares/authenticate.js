import { unauthorized } from "../utils/errors.js";
import { cookieNames, readCookie } from "../utils/cookies.js";

// Las tres partes de un JWT en base64url, separadas por puntos
const JWT = String.raw`[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+`;
// "Bearer <token>": el esquema sin distinguir mayúsculas (RFC 6750) y un solo token
const BEARER = new RegExp(`^Bearer (${JWT})$`, "i");
const COOKIE_TOKEN = new RegExp(`^${JWT}$`);

/**
 * El token de acceso de la petición: la cabecera Authorization si viene (Swagger, Postman, los
 * tests) y, si no, la cookie de sesión. null si no hay; 401 si lo que llega no es un JWT.
 */
export function readAccessToken(req, cookieConfig) {
  const header = req.headers.authorization;
  if (header) {
    const match = BEARER.exec(header.trim());
    if (!match) throw unauthorized("TOKEN_INVALID");
    return match[1];
  }
  const cookie = readCookie(req, cookieNames(cookieConfig).session);
  if (cookie === undefined) return null;
  if (!COOKIE_TOKEN.test(cookie)) throw unauthorized("TOKEN_INVALID");
  return cookie;
}

/**
 * Exige sesión: token válido (firma, algoritmo, iss, aud, exp) y usuario que sigue pudiendo entrar.
 * Deja req.user { id, name, email, role } y req.auth (el payload: jti, sid, exp...).
 */
export function createAuthenticate({ tokens, auth, cookies }) {
  return async function authenticate(req, res, next) {
    const payload = await tokens.verifyAccess(readAccessToken(req, cookies));
    req.user = await auth.authenticate(payload);
    req.auth = payload;
    next();
  };
}
