import { createPrivateKey, createPublicKey } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateJwkThumbprint } from "jose";

/*
 * Las claves con las que se firman los tokens (RS256). La privada solo la tiene este servicio;
 * la pública sale en el JWKS (/auth/.well-known/jwks.json) para que la API, la IA y la gateway
 * comprueben los tokens sin poder fabricarlos.
 *
 * El kid (key id) es la huella de la clave pública (RFC 7638): cambia solo si cambia la clave, y
 * así un token dice con qué clave se firmó. Al rotar, la anterior sigue publicada un tiempo.
 */
export const ALGORITHM = "RS256";
const MIN_MODULUS_BITS = 2048;

const serviceRoot = fileURLToPath(new URL("../..", import.meta.url));

function readPem(file, label) {
  const fullPath = path.resolve(serviceRoot, file);
  try {
    return readFileSync(fullPath, "utf8");
  } catch {
    throw new Error(`${label} not found at ${fullPath} (run npm run keys, or set JWT_PRIVATE_KEY)`);
  }
}

// Solo RSA de 2048 bits o más: con menos, RS256 ya no se considera seguro
function assertRsa(key, label) {
  const details = key.asymmetricKeyDetails;
  if (key.asymmetricKeyType !== "rsa" || !details || details.modulusLength < MIN_MODULUS_BITS) {
    throw new Error(`${label} must be an RSA key of at least ${MIN_MODULUS_BITS} bits`);
  }
}

// La parte pública en JWK, con lo justo: nunca d, p, q... (eso sería la privada)
async function publicJwk(key) {
  const publicKey = key.type === "public" ? key : createPublicKey(key);
  const { kty, n, e } = publicKey.export({ format: "jwk" });
  const jwk = { kty, n, e };
  return Object.freeze({ ...jwk, kid: await calculateJwkThumbprint(jwk), alg: ALGORITHM, use: "sig" });
}

/**
 * Carga la clave privada (del entorno o de su archivo) y, si la hay, la pública anterior.
 * Devuelve { privateKey, kid, jwks }. Lanza un Error legible si falta o no vale.
 */
export async function loadKeys(jwtConfig) {
  const pem = jwtConfig.privateKey ?? readPem(jwtConfig.privateKeyFile, "JWT private key");

  let privateKey;
  try {
    privateKey = createPrivateKey(pem);
  } catch {
    throw new Error("JWT private key is not a valid PEM private key");
  }
  assertRsa(privateKey, "JWT private key");

  const current = await publicJwk(privateKey);
  const keys = [current];

  if (jwtConfig.previousPublicKeyFile) {
    let previous;
    try {
      previous = createPublicKey(readPem(jwtConfig.previousPublicKeyFile, "Previous JWT public key"));
    } catch (error) {
      throw error.message.includes("not found") ? error : new Error("Previous JWT public key is not a valid PEM");
    }
    assertRsa(previous, "Previous JWT public key");
    const jwk = await publicJwk(previous);
    if (jwk.kid !== current.kid) keys.push(jwk);
  }

  return Object.freeze({ privateKey, kid: current.kid, jwks: Object.freeze({ keys: Object.freeze(keys) }) });
}
