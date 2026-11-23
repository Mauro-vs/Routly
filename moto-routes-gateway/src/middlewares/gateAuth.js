import { errors as joseErrors, jwtVerify } from "jose";
import { createError } from "../utils/errors.js";
import { requiresSession } from "../config/policies.js";

/*
 * El token, comprobado en la puerta con la clave pública de auth (su JWKS): firma RS256, emisor,
 * audiencia y caducidad. Sin base de datos: la lista negra, el usuario y el rol los mira la API.
 *
 * Responde exactamente como la API, porque los interceptores del panel y de la web cuentan con
 * ello: un 401 con code TOKEN_EXPIRED o sin code → renuevan con /auth/refresh; TOKEN_INVALID →
 * cierran la sesión. Y la gateway nunca dice a los servicios quién es el usuario: reenvía el
 * token tal cual y la API lo vuelve a comprobar.
 */

const ALGORITHM = "RS256";
// El mismo margen que la API para relojes un poco desfasados
const CLOCK_TOLERANCE_SECONDS = 30;

// Las tres partes de un JWT en base64url
const JWT = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*$/;
const BEARER = /^Bearer (\S+)$/i;

// Los fallos que son culpa del token (los mismos que en la API). Cualquier otro (el JWKS no se
// puede descargar) no dice nada del token
const INVALID_TOKEN_ERRORS = new Set([
  "ERR_JWT_INVALID",
  "ERR_JWT_CLAIM_VALIDATION_FAILED",
  "ERR_JWS_INVALID",
  "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
  "ERR_JOSE_ALG_NOT_ALLOWED",
  "ERR_JOSE_NOT_SUPPORTED",
  "ERR_JWKS_NO_MATCHING_KEY",
  "ERR_JWKS_MULTIPLE_MATCHING_KEYS",
]);

const unauthorized = (code) => createError("Authentication required", 401, code ? { code } : {});

/** Una cookie de la cabecera Cookie, sin cookie-parser. */
function readCookie(header, name) {
  for (const part of (header ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return part.slice(separator + 1).trim();
    }
  }
  return undefined;
}

/**
 * De dónde sale el token, como en la API: primero Authorization: Bearer (Swagger, Postman), si no
 * la cookie de sesión, con o sin __Secure- (COOKIE_SECURE en auth). null si no hay.
 */
function readCredentials(req) {
  const header = req.headers.authorization;
  if (header) return { token: BEARER.exec(header.trim())?.[1] ?? "", fromCookie: false };
  const token = readCookie(req.headers.cookie, "__Secure-routly_session") ?? readCookie(req.headers.cookie, "routly_session");
  return token === undefined ? null : { token, fromCookie: true };
}

/** Comprueba el token. Lanza el 401 (con su code) o el 503 que daría la API. */
async function verify(token, { keys, issuer, audience }) {
  if (!JWT.test(token)) throw unauthorized("TOKEN_INVALID");
  try {
    await jwtVerify(token, keys, {
      algorithms: [ALGORITHM],
      issuer,
      audience,
      requiredClaims: ["exp", "sub", "jti"],
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });
  } catch (error) {
    if (error instanceof joseErrors.JWTExpired) throw unauthorized("TOKEN_EXPIRED");
    if (INVALID_TOKEN_ERRORS.has(error?.code)) throw unauthorized("TOKEN_INVALID");
    console.error(`Cannot check the token: JWKS not available (${error.message})`);
    throw createError("Authentication service unavailable", 503);
  }
}

/**
 * - Ruta que exige sesión (config/policies.js): sin token, 401 sin code; token malo, 401 con su
 *   code; JWKS caído, 503. Solo pasa lo que lleva un token auténtico.
 * - Ruta pública: como el optionalAuth de la API. Una cookie que ya no sirve pasa como anónimo
 *   (una cookie vieja no rompe las páginas públicas) y se reenvía igual: la renueva o la borra
 *   auth. Una cabecera Authorization mala sí es un 401. Si el JWKS no responde, pasa: lo público
 *   no depende de auth.
 */
export function gateAuth({ keys, issuer, audience }) {
  return async (req, res, next) => {
    const required = requiresSession(req.method, req.path);
    const credentials = readCredentials(req);
    if (!credentials) return required ? block(req, next, unauthorized()) : next();
    if (!required && credentials.fromCookie) return next();

    try {
      await verify(credentials.token, { keys, issuer, audience });
      next();
    } catch (error) {
      if (!required && error.status === 503) return next();
      block(req, next, error);
    }
  };
}

// Para el registro: esta petición la cortó la puerta
function block(req, next, error) {
  req.blockedBy = "auth";
  next(error);
}
