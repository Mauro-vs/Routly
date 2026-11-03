import { isAllowedOrigin } from "../config/cors.js";
import { revokedTokenRepository } from "../repositories/revokedToken.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { createError, unauthorized } from "../utils/errors.js";
import { verifyToken } from "../utils/jwt.js";
import { SESSION_COOKIE, clearSessionCookie, readCookie } from "../utils/session-cookie.js";

// Las tres partes de un JWT en base64url, separadas por puntos
const JWT = String.raw`[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*`;
// "Bearer <token>": el esquema sin distinguir mayúsculas (RFC 6750) y un solo token
const BEARER = new RegExp(`^Bearer (${JWT})$`, "i");
const COOKIE_TOKEN = new RegExp(`^${JWT}$`);

// Lo que solo lee no cambia nada: no hace falta comprobar de dónde viene
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// La sesión llega por la cookie: no hay cabecera Authorization y sí cookie de sesión
const usesCookie = (req) => !req.headers.authorization && readCookie(req, SESSION_COOKIE) !== undefined;

/**
 * De dónde sale el token. Manda la cabecera Authorization si viene (Swagger, Postman, los
 * tests); si no, la cookie de sesión del panel. null: no hay sesión.
 */
function readCredentials(req) {
  const header = req.headers.authorization;
  if (header) {
    const match = BEARER.exec(header.trim());
    if (!match) throw unauthorized("TOKEN_INVALID");
    return { token: match[1], fromCookie: false };
  }

  const cookie = readCookie(req, SESSION_COOKIE);
  if (cookie === undefined) return null;
  if (!COOKIE_TOKEN.test(cookie)) throw unauthorized("TOKEN_INVALID");
  return { token: cookie, fromCookie: true };
}

/**
 * Para los GET públicos que enseñan más a un admin (services/visibility.js). Sin sesión sigue
 * como anónimo. Con cabecera Authorization, igual que authenticate: un token que no sirve es un
 * 401, no un anónimo. Con una cookie que ya no sirve (caducada, cerrada, de un usuario
 * desactivado), anónimo y se borra: una cookie vieja no debe romper las páginas públicas.
 */
export function optionalAuth(req, res, next) {
  if (req.headers.authorization) return authenticate(req, res, next);
  if (!usesCookie(req)) return next();

  return authenticate(req, res, (error) => {
    if (error?.status === 401) {
      clearSessionCookie(res);
      return next();
    }
    next(error);
  });
}

/**
 * Exige sesión. Lee el token de Authorization: Bearer <token> o, si no viene, de la cookie
 * de sesión (utils/session-cookie.js). Comprueba la firma y la caducidad
 * (verifyToken), que el token no se haya cerrado con un logout (lista negra) y que el
 * usuario siga existiendo: no eliminado, activo, con un rol activo y el mismo tokenVersion.
 *
 * Deja en req.user { id, email, role, name }, con el rol leído de la base de datos: un
 * cambio de rol se aplica en la siguiente petición, sin esperar al token. Y en req.auth
 * { jti, expiresAt }: lo que necesita el logout para cerrar esta sesión.
 *
 * Con la cookie, además, una petición que cambia datos desde un origen que no es el nuestro
 * es un 403 (CSRF), y un token que no sirve borra la cookie.
 *
 * Cualquier fallo de la sesión es el mismo 401 "Authentication required" (utils/errors.js).
 */
export async function authenticate(req, res, next) {
  try {
    const credentials = readCredentials(req);
    if (!credentials) throw unauthorized();

    if (credentials.fromCookie && !SAFE_METHODS.has(req.method) && !isAllowedOrigin(req)) {
      throw createError("Request origin not allowed", 403);
    }

    const payload = verifyToken(credentials.token);
    const [user, revoked] = await Promise.all([
      userRepository.findAuthById(payload.sub),
      revokedTokenRepository.isRevoked(payload.jti),
    ]);

    if (revoked || !user || !user.isActive || !user.role?.isActive || user.tokenVersion !== payload.tv) {
      throw unauthorized("TOKEN_INVALID");
    }

    req.user = { id: String(user._id), email: user.email, role: user.role.name, name: user.name };
    req.auth = { jti: payload.jti, expiresAt: new Date(payload.exp * 1000) };
    next();
  } catch (error) {
    if (error.status === 401 && usesCookie(req)) clearSessionCookie(res);
    next(error);
  }
}
