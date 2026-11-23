// Crea un certificado autofirmado para la gateway en desarrollo: certs/cert.pem y certs/key.pem
// (no se suben). Vale para localhost y los nombres de la web y el panel. El navegador avisará la
// primera vez (no lo firma nadie de confianza); para evitarlo, mejor mkcert (ver el README).
//
//   npm run certs            lo crea si no existe
//   npm run certs -- --force lo vuelve a crear
import "dotenv/config";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import selfsigned from "selfsigned";
import { loadConfig } from "../src/config/env.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = loadConfig();
const certFile = path.resolve(root, config.tls.certFile);
const keyFile = path.resolve(root, config.tls.keyFile);

if (existsSync(certFile) && existsSync(keyFile) && !process.argv.includes("--force")) {
  console.log(`The certificate already exists (${path.relative(root, certFile)}). Use --force to create a new one`);
  process.exit(0);
}

const hosts = ["localhost", ...Object.values(config.frontends).map((frontend) => frontend.host)];
const notBeforeDate = new Date();
const notAfterDate = new Date(notBeforeDate);
// Más de 398 días y los navegadores lo rechazan aunque se acepte el aviso
notAfterDate.setDate(notAfterDate.getDate() + 365);

const pems = await selfsigned.generate([{ name: "commonName", value: "Routly gateway (dev)" }], {
  keySize: 2048,
  algorithm: "sha256",
  notBeforeDate,
  notAfterDate,
  extensions: [
    { name: "basicConstraints", cA: false },
    { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
    { name: "extKeyUsage", serverAuth: true },
    {
      name: "subjectAltName",
      altNames: [...hosts.map((value) => ({ type: 2, value })), { type: 7, ip: "127.0.0.1" }, { type: 7, ip: "::1" }],
    },
  ],
});

mkdirSync(path.dirname(certFile), { recursive: true });
writeFileSync(certFile, pems.cert);
writeFileSync(keyFile, pems.private, { mode: 0o600 });
console.log(`Self-signed certificate created for ${hosts.join(", ")}:`);
console.log(`  ${path.relative(root, certFile)}`);
console.log(`  ${path.relative(root, keyFile)}`);
