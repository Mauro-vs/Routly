import argon2 from "argon2";

// Copia de moto-routes-api/src/utils/passwd.js: los dos servicios tienen que hashear igual (el
// panel aún crea usuarios con contraseña desde la API). Si cambias los parámetros, cámbialos en
// los dos; needsRehash() rehace en el login los hashes antiguos sin que el usuario note nada.
//
// Argon2id con los parámetros mínimos que recomienda OWASP: 19 MiB, 2 pasadas y 1 hilo.
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

/** true si la contraseña corresponde al hash. Un hash vacío o mal formado da false, no lanza. */
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
