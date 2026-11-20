import { errors as joseErrors, jwtVerify } from "jose";
import { getKeySet, loadAuthConfig } from "../config/auth.js";
import { createError, unauthorized } from "./errors.js";
import { OBJECT_ID_PATTERN } from "./objectId.js";

// El algoritmo es fijo: ni "none" ni HS256 (el ataque de firmar con la clave pública como secreto)
const ALGORITHM = "RS256";
// Margen para relojes un poco desfasados entre la API y el servicio de auth
const CLOCK_TOLERANCE_SECONDS = 30;

// Los fallos que son culpa del token. Cualquier otro (el JWKS no se puede descargar o el servicio
// de auth responde mal) no dice nada del token
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Lo que tiene que traer un token del servicio de auth: si falta algo, no es válido
const isValidPayload = (payload) =>
  OBJECT_ID_PATTERN.test(payload?.sub) &&
  typeof payload.role === "string" &&
  Number.isInteger(payload.tv) &&
  UUID_PATTERN.test(payload.jti);

/**
 * Comprueba un token de acceso del servicio de auth (moto-routes-auth) y devuelve su payload:
 * firma RS256 con una clave de su JWKS, iss, aud y caducidad. Payload: sub (id del usuario), role,
 * tv (tokenVersion), sid (la sesión), jti, iat y exp.
 *
 * Caducado, 401 TOKEN_EXPIRED; cualquier otro fallo del token, 401 TOKEN_INVALID. Si no se puede
 * descargar el JWKS (el servicio de auth no responde), 503: el token puede ser bueno, así que el
 * cliente no debe cerrar la sesión. Que el usuario siga existiendo lo comprueba authenticate.
 */
export async function verifyToken(token) {
  if (!token) throw unauthorized();
  const { issuer, audience } = loadAuthConfig();

  let payload;
  try {
    ({ payload } = await jwtVerify(token, getKeySet(), {
      algorithms: [ALGORITHM],
      issuer,
      audience,
      requiredClaims: ["exp", "sub", "jti"],
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    }));
  } catch (error) {
    if (error instanceof joseErrors.JWTExpired) throw unauthorized("TOKEN_EXPIRED");
    if (INVALID_TOKEN_ERRORS.has(error?.code)) throw unauthorized("TOKEN_INVALID");
    console.error(`Cannot check the token: JWKS not available (${error.message})`);
    throw createError("Authentication service unavailable", 503);
  }

  if (!isValidPayload(payload)) throw unauthorized("TOKEN_INVALID");
  return payload;
}
