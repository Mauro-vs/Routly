import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

// La carpeta de la gateway: las rutas del certificado son relativas a ella, se arranque desde donde se arranque
export const GATEWAY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Lee el certificado y su clave (los de npm run certs, o los de mkcert). Si faltan, un error que
 * dice cómo crearlos.
 */
export function loadTls({ certFile, keyFile }, root = GATEWAY_ROOT) {
  const cert = path.resolve(root, certFile);
  const key = path.resolve(root, keyFile);
  try {
    return { cert: readFileSync(cert), key: readFileSync(key) };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    throw new Error(
      `No HTTPS certificate (${path.relative(root, cert)} and ${path.relative(root, key)}). ` +
        "Run npm run certs (self-signed) or create them with mkcert (see the README)",
    );
  }
}

/**
 * El servidor de la gateway (HTTPS, o HTTP si HTTPS=false) con los WebSocket de los frontales, y
 * el de redirección a HTTPS si hay HTTP_PORT. Los devuelve sin arrancar.
 */
export function createServers({ app, config, tls }) {
  const main = config.https ? https.createServer(tls, app) : http.createServer(app);
  main.on("upgrade", (req, socket, head) => app.locals.upgrade(req, socket, head));

  let redirect = null;
  if (config.https && config.httpPort) {
    const hosts = Object.values(config.frontends).map((frontend) => frontend.host);
    redirect = http.createServer((req, res) => {
      // Solo a un nombre nuestro: con un Host cualquiera sería una redirección abierta
      const asked = (req.headers.host ?? "").toLowerCase().replace(/:\d+$/, "");
      const host = hosts.includes(asked) || asked === "localhost" ? asked : config.frontends.web.host;
      const port = config.port === 443 ? "" : `:${config.port}`;
      res.writeHead(301, { location: `https://${host}${port}${req.url}` }).end();
    });
  }
  return { main, redirect };
}
