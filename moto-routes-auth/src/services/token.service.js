import { createHash, randomBytes, randomUUID } from "node:crypto";
import { SignJWT, createLocalJWKSet, errors as joseErrors, jwtVerify } from "jose";
import { ALGORITHM } from "../config/keys.js";
import { unauthorized } from "../utils/errors.js";

/*
 * Los tokens de la sesión.
 *
 * Acceso: un JWT RS256 de vida corta. Payload: sub (id del usuario), role (su name), tv
 * (tokenVersion: si cambia en la base de datos, los tokens anteriores dejan de servir), sid (la
 * sesión, para cerrarla con su refresh), jti (su id, para la lista negra del logout), iss, aud,
 * iat y exp. Sin email ni nombre: un JWT se lee sin clave, así que no lleva datos personales.
 *
 * Refresh: 32 bytes aleatorios, no un JWT. Solo vale contra este servicio, que guarda su hash.
 */

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Margen para relojes un poco desfasados entre servicios
const CLOCK_TOLERANCE_SECONDS = 30;

// Lo que tiene que traer un token nuestro: si falta algo, no es válido
const isValidPayload = (payload) =>
  OBJECT_ID.test(payload?.sub) &&
  typeof payload.role === "string" &&
  Number.isInteger(payload.tv) &&
  UUID.test(payload.jti) &&
  UUID.test(payload.sid);

/** El hash con el que se guarda un refresh: si alguien lee la base de datos, no puede usarlo. */
export const hashRefreshToken = (token) => createHash("sha256").update(token).digest("base64url");

export function createTokenService({ keys, jwt, now = Date.now }) {
  // Se comprueba contra el mismo JWKS que publica el servicio: lo mismo que harán la API y la IA
  const keySet = createLocalJWKSet(keys.jwks);
  const seconds = () => Math.floor(now() / 1000);

  return {
    accessTtl: jwt.accessTtl,
    refreshTtl: jwt.refreshTtl,

    /** Firma el token de acceso. role es el name del rol ("admin"), no el documento. */
    async signAccess({ userId, role, tokenVersion, sessionId }) {
      const iat = seconds();
      return new SignJWT({ role, tv: tokenVersion, sid: sessionId })
        .setProtectedHeader({ alg: ALGORITHM, kid: keys.kid, typ: "JWT" })
        .setSubject(String(userId))
        .setIssuer(jwt.issuer)
        .setAudience(jwt.audience)
        .setIssuedAt(iat)
        .setExpirationTime(iat + jwt.accessTtl)
        .setJti(randomUUID())
        .sign(keys.privateKey);
    },

    /**
     * Comprueba firma, algoritmo (solo RS256: ni "none" ni HS256), kid, iss, aud y exp, y devuelve
     * el payload. Si algo falla, 401. Que el usuario siga activo lo comprueba authenticate.
     */
    async verifyAccess(token) {
      if (!token) throw unauthorized();
      let payload;
      try {
        ({ payload } = await jwtVerify(token, keySet, {
          algorithms: [ALGORITHM],
          issuer: jwt.issuer,
          audience: jwt.audience,
          requiredClaims: ["exp", "iat", "sub", "jti"],
          clockTolerance: CLOCK_TOLERANCE_SECONDS,
          currentDate: new Date(now()),
        }));
      } catch (error) {
        throw unauthorized(error instanceof joseErrors.JWTExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID");
      }
      if (!isValidPayload(payload)) throw unauthorized("TOKEN_INVALID");
      return payload;
    },

    /** Un refresh nuevo: el valor para la cookie y el hash para la base de datos. */
    newRefreshToken() {
      const token = randomBytes(32).toString("base64url");
      return { token, hash: hashRefreshToken(token) };
    },
  };
}
