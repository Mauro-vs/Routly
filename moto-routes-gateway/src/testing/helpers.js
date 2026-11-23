import http from "node:http";
import { createApp } from "../app.js";
import { loadConfig } from "../config/env.js";
import { testKeys } from "./tokens.js";

process.env.NODE_ENV ??= "test";

/**
 * Cierra un servidor de verdad: también las conexiones abiertas, incluidos los WebSocket (que
 * closeAllConnections no ve). Sin esto, un test con un WebSocket se quedaría colgado.
 */
function closer(server) {
  const sockets = new Set();
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  return () =>
    new Promise((resolve) => {
      server.close(resolve);
      for (const socket of sockets) socket.destroy();
    });
}

/** Escucha en un puerto libre de 127.0.0.1. Devuelve el servidor y su URL. */
async function listen(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

/**
 * Un servicio falso. Por defecto contesta 200 con lo que le ha llegado (método, url, cabeceras y
 * cuerpo), para comprobar qué reenvía la gateway. `routes` cambia la respuesta de una ruta concreta
 * ("MÉTODO /ruta", sin la query): un handler (req, res, body) de node:http.
 */
export async function startUpstream(routes = {}) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8");
    requests.push({ method: req.method, url: req.url, headers: req.headers, body });

    const handler = routes[`${req.method} ${req.url.split("?")[0]}`];
    if (handler) return handler(req, res, body);
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ method: req.method, url: req.url, headers: req.headers, body }));
  });
  // Un WebSocket "de eco": acepta el handshake y devuelve lo que le llegue
  server.on("upgrade", (req, socket) => {
    requests.push({ method: req.method, url: req.url, headers: req.headers, upgrade: true });
    socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n");
    socket.on("data", (data) => socket.write(data));
  });
  const close = closer(server);
  const url = await listen(server);
  return { url, requests, close };
}

/** Una URL donde no escucha nadie (un servicio caído): se abre un puerto y se cierra. */
export async function deadUrl() {
  const server = http.createServer();
  const url = await listen(server);
  await new Promise((resolve) => server.close(resolve));
  return url;
}

/**
 * Una petición con node:http, para lo que fetch no deja: elegir el Host (routly.localhost) o
 * pedir un WebSocket. Devuelve { status, headers, text, body }.
 */
export function rawRequest(base, path, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(`${base}${path}`, { method, headers }, async (response) => {
      let text = "";
      response.setEncoding("utf8");
      for await (const chunk of response) text += chunk;
      let json = text;
      try {
        json = JSON.parse(text);
      } catch {
        // No es JSON
      }
      resolve({ status: response.statusCode, headers: response.headers, text, body: json });
    });
    request.on("error", reject);
    request.end(body);
  });
}

/** La configuración de los tests, con los servicios en las URL que se pasen. */
export function testConfig(overrides = {}) {
  return loadConfig({ NODE_ENV: "test", ...overrides });
}

/**
 * Arranca la gateway en un puerto libre. Devuelve request(path, init) → { status, headers, body,
 * text }, las líneas del registro (logs) y close().
 */
export async function startGateway({ config = testConfig(), fetch, keys = testKeys } = {}) {
  const logs = [];
  const app = createApp({ config, fetch, keys, log: (line) => logs.push(JSON.parse(line)) });
  const server = http.createServer(app);
  server.on("upgrade", (req, socket, head) => app.locals.upgrade(req, socket, head));
  const close = closer(server);
  const base = await listen(server);
  return {
    base,
    server,
    logs,
    async request(path, init = {}) {
      const response = await globalThis.fetch(`${base}${path}`, init);
      const text = await response.text();
      let body = text;
      try {
        body = JSON.parse(text);
      } catch {
        // No es JSON: se deja como texto
      }
      return { status: response.status, headers: response.headers, body, text };
    },
    close,
  };
}

/** Arranca los tres servicios y los dos frontales (su ng serve) falsos, y una gateway que los apunta. */
export async function startStack({ api = {}, auth = {}, ai = {}, web = {}, panel = {}, env = {}, keys } = {}) {
  const upstreams = {
    api: await startUpstream(api),
    auth: await startUpstream(auth),
    ai: await startUpstream(ai),
    web: await startUpstream(web),
    panel: await startUpstream(panel),
  };
  const gateway = await startGateway({
    config: testConfig({
      API_URL: upstreams.api.url,
      AUTH_URL: upstreams.auth.url,
      AI_URL: upstreams.ai.url,
      WEB_URL: upstreams.web.url,
      PANEL_URL: upstreams.panel.url,
      ...env,
    }),
    keys,
  });
  return {
    gateway,
    ...upstreams,
    async close() {
      await gateway.close();
      await Promise.all(Object.values(upstreams).map((upstream) => upstream.close()));
    },
  };
}
