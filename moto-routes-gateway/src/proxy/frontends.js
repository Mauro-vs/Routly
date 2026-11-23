import path from "node:path";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { sendError } from "../middlewares/errorHandler.js";
import { stripUntrustedHeaders } from "../middlewares/cleanHeaders.js";
import { createError } from "../utils/errors.js";

// Los archivos de Angular con hash en el nombre (main-ABCD1234.js) no cambian nunca: caché de un
// año. El resto (index.html, favicon...) se revalida siempre
const HASHED = /-[A-Z0-9]{8}\.(js|css|mjs)$/;

/**
 * Sirve una build de Angular (ng build): los archivos tal cual y, para cualquier otra ruta de la
 * app (/experiencias/costa), su index.html, que el router de Angular resuelve.
 */
function staticFrontend({ dist }) {
  const root = path.resolve(dist);
  const files = express.static(root, {
    index: false,
    setHeaders(res, file) {
      res.setHeader("cache-control", HASHED.test(file) ? "public, max-age=31536000, immutable" : "no-cache");
    },
  });
  return (req, res, next) =>
    files(req, res, () => {
      // Un archivo que no existe (/logo.png) es un 404; una ruta de la app, su index.html
      if (!["GET", "HEAD"].includes(req.method) || path.extname(req.path)) return next();
      res.setHeader("cache-control", "no-cache");
      res.sendFile(path.join(root, "index.html"), (error) => error && next(error));
    });
}

/**
 * En desarrollo, el ng serve del frontal. changeOrigin: le llega su propio Host (localhost:4300),
 * el único que acepta su servidor de desarrollo. ws: el live reload va por WebSocket.
 */
function devFrontend({ name, target }) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    on: {
      proxyReq(proxyReq, req) {
        req.service = name;
      },
      error(err, req, res) {
        // Un WebSocket que no conecta: se cierra y el navegador lo reintenta
        if (!res || typeof res.setHeader !== "function") return res?.destroy?.();
        console.warn(`[${name}] ${err.code ?? err.message}: is ng serve running on ${target}?`);
        sendError(res, 502, `The ${name} app is not available`);
      },
    },
  });
}

/**
 * Los dos frontales, por el nombre con el que llama el navegador (Host): routly.localhost es la
 * web y panel.routly.localhost el panel. Lo que no es de /api, /auth ni /ai acaba aquí.
 *
 * Devuelve el middleware de Express y upgrade, para los WebSocket (que no pasan por Express).
 */
export function createFrontends(frontends) {
  const byHost = new Map(
    Object.values(frontends).map((frontend) => [
      frontend.host,
      { ...frontend, handler: frontend.dist ? staticFrontend(frontend) : devFrontend(frontend) },
    ]),
  );
  const hosts = [...byHost.keys()].join(" or ");
  const find = (hostHeader = "") => byHost.get(hostHeader.toLowerCase().replace(/:\d+$/, ""));

  function middleware(req, res, next) {
    const frontend = find(req.headers.host);
    if (!frontend) return next(createError(`Unknown host: use ${hosts}`, 421));
    req.service ??= frontend.name;
    frontend.handler(req, res, next);
  }

  function upgrade(req, socket, head) {
    const frontend = find(req.headers.host);
    if (!frontend || frontend.dist) return socket.destroy();
    stripUntrustedHeaders(req);
    frontend.handler.upgrade(req, socket, head);
  }

  return { middleware, upgrade, hosts: [...byHost.keys()] };
}
