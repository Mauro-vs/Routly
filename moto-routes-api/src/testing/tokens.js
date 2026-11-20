import { generateKeyPairSync, randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { useLocalKeySet } from "../config/auth.js";

/*
 * Los tokens de los tests. En producción los firma el servicio de auth; aquí, una clave RSA de
 * prueba generada al vuelo, con los mismos claims. La API los comprueba con su JWKS en memoria
 * (useLocalKeySet), sin levantar el servicio de auth.
 */
export const TEST_KID = "test-key";

const newKeyPair = () => generateKeyPairSync("rsa", { modulusLength: 2048 });
const { privateKey, publicKey } = newKeyPair();

export const TEST_JWKS = Object.freeze({
  keys: [{ ...publicKey.export({ format: "jwk" }), kid: TEST_KID, alg: "RS256", use: "sig" }],
});

// Otra clave que la API no conoce: para probar que un token firmado con ella no vale
export const otherPrivateKey = newKeyPair().privateKey;

/** Hace que la API compruebe los tokens con el JWKS de los tests. */
export function useTestKeys() {
  useLocalKeySet(TEST_JWKS);
}

/**
 * Un token de acceso como los del servicio de auth para un usuario { _id, role, tokenVersion }.
 * options cambia lo que haga falta para probar un token que no vale: exp, iss, aud, la clave...
 */
export function signTestToken(
  { _id, role, tokenVersion = 0 },
  { expiresIn = 900, issuer = "routly-auth", audience = "routly", key = privateKey, kid = TEST_KID, alg = "RS256", claims = {} } = {}
) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role, tv: tokenVersion, sid: randomUUID(), ...claims })
    .setProtectedHeader({ alg, kid, typ: "JWT" })
    .setSubject(String(_id))
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .setJti(randomUUID())
    .sign(key);
}
