import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * npm run keys: crea el par de claves RSA de desarrollo en keys/ (que está en .gitignore).
 *   keys/private.pem  la privada (PKCS#8): solo la lee este servicio. Nunca se sube ni se copia
 *   keys/public.pem   la pública (SPKI): por si quieres verla; los demás servicios usan el JWKS
 *
 * Si ya existen no se tocan (se cerrarían todas las sesiones). Para rotar: npm run keys -- --force,
 * y antes pon la pública vieja en JWT_PREVIOUS_PUBLIC_KEY_FILE para que sus tokens sigan valiendo.
 */
const keysDir = fileURLToPath(new URL("../keys", import.meta.url));
const privatePath = path.join(keysDir, "private.pem");
const publicPath = path.join(keysDir, "public.pem");
const force = process.argv.includes("--force");

if (existsSync(privatePath) && !force) {
  console.log(`Keys already exist in ${keysDir} (use --force to replace them)`);
  process.exit(0);
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

mkdirSync(keysDir, { recursive: true });
// 0600: solo el usuario que arranca el servicio puede leer la privada (en Windows no aplica)
writeFileSync(privatePath, privateKey, { mode: 0o600 });
writeFileSync(publicPath, publicKey);
console.log(`RSA keys written to ${keysDir}`);
