import http from "node:http";
import { createApp } from "../app.js";
import { loadConfig } from "../config/env.js";

process.env.NODE_ENV ??= "test";

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
  const url = await listen(server);
  return {
    url,
    requests,
    close: () => new Promise((resolve) => server.closeAllConnections() || server.close(resolve)),
  };
}

/** Una URL donde no escucha nadie (un servicio caído): se abre un puerto y se cierra. */
export async function deadUrl() {
  const server = http.createServer();
  const url = await listen(server);
  await new Promise((resolve) => server.close(resolve));
  return url;
}

/** La configuración de los tests, con los servicios en las URL que se pasen. */
export function testConfig(overrides = {}) {
  return loadConfig({ NODE_ENV: "test", ...overrides });
}

/**
 * Arranca la gateway en un puerto libre. Devuelve request(path, init) → { status, headers, body,
 * text }, las líneas del registro (logs) y close().
 */
export async function startGateway({ config = testConfig(), fetch } = {}) {
  const logs = [];
  const app = createApp({ config, fetch, log: (line) => logs.push(JSON.parse(line)) });
  const server = http.createServer(app);
  const base = await listen(server);
  return {
    base,
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
    close: () => new Promise((resolve) => server.closeAllConnections() || server.close(resolve)),
  };
}

/** Arranca los tres servicios falsos y una gateway que los apunta. */
export async function startStack({ api = {}, auth = {}, ai = {}, env = {} } = {}) {
  const upstreams = { api: await startUpstream(api), auth: await startUpstream(auth), ai: await startUpstream(ai) };
  const gateway = await startGateway({
    config: testConfig({ API_URL: upstreams.api.url, AUTH_URL: upstreams.auth.url, AI_URL: upstreams.ai.url, ...env }),
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
