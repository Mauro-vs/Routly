import { randomUUID } from "node:crypto";
import { SignJWT, calculateJwkThumbprint, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";

/*
 * Claves y tokens de prueba, como los de auth: RS256, kid = huella RFC 7638, iss routly-auth,
 * aud routly. La gateway de los tests comprueba con este JWKS local, sin llamar a auth.
 */

const { privateKey, publicKey } = await generateKeyPair("RS256");
const publicJwk = await exportJWK(publicKey);
const kid = await calculateJwkThumbprint(publicJwk);

/** El JWKS de los tests (lo que en producción se descarga de auth). */
export const testKeys = createLocalJWKSet({ keys: [{ ...publicJwk, kid, alg: "RS256", use: "sig" }] });

/** Otra clave que la gateway no conoce: sus tokens tienen la firma mala. */
const other = await generateKeyPair("RS256");

/**
 * Un token de acceso como los de auth. Se puede cambiar lo que haga falta para probar fallos:
 * expiresIn (negativo = caducado), issuer, audience, foreignKey (firma con otra clave).
 */
export async function signToken({
  sub = "6b0490b2776e59396e7b9c9d",
  role = "rider",
  expiresIn = 900,
  issuer = "routly-auth",
  audience = "routly",
  foreignKey = false,
} = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role, tv: 0, sid: randomUUID() })
    .setProtectedHeader({ alg: "RS256", kid, typ: "JWT" })
    .setSubject(sub)
    .setJti(randomUUID())
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .setIssuer(issuer)
    .setAudience(audience)
    .sign(foreignKey ? other.privateKey : privateKey);
}
