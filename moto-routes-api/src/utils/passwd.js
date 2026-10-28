import argon2 from "argon2";

// Argon2id con los parámetros mínimos que recomienda OWASP: 19 MiB de memoria, 2
// pasadas y 1 hilo. Si se suben, needsRehash() lo detecta y el login rehace los hashes
// antiguos sin que el usuario note nada.
export const ARGON2_OPTIONS = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
});

/** Hash de una contraseña: "$argon2id$v=19$m=19456,p=1,t=2$<sal>$<hash>". La sal va dentro. */
export function hashPassword(plain) {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

/**
 * true si la contraseña corresponde al hash. Un hash vacío o mal formado devuelve false
 * en vez de lanzar: para quien inicia sesión es lo mismo que una contraseña incorrecta.
 */
export async function verifyPassword(hash, plain) {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/** true si el hash se hizo con otros parámetros (o no es de Argon2) y hay que rehacerlo. */
export function needsRehash(hash) {
  try {
    return argon2.needsRehash(hash, ARGON2_OPTIONS);
  } catch {
    return true;
  }
}
