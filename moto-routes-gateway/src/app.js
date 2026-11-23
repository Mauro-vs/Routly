import express from "express";
import { accessLog } from "./middlewares/accessLog.js";
import { bodyLimit } from "./middlewares/bodyLimit.js";
import { cleanHeaders } from "./middlewares/cleanHeaders.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { requestId } from "./middlewares/requestId.js";
import { createFrontends } from "./proxy/frontends.js";
import { serviceProxy } from "./proxy/serviceProxy.js";
import { healthRouter } from "./routes/health.js";

/**
 * Monta la gateway. La usan server.js (que solo arranca) y los tests, así que los tests prueban
 * la misma app que se ejecuta, sin copiarla.
 *
 * Todo lo de fuera llega por parámetro: la configuración (config/env.js), fetch (para
 * /gateway/ready) y dónde se escribe el registro.
 *
 * Orden: id de la petición → registro → limpiar cabeceras → tope del cuerpo → salud propia →
 * los tres servicios por prefijo → el frontal de ese Host (web o panel) → error. Nada lee el
 * cuerpo (sin express.json): se reenvía en streaming.
 *
 * Los WebSocket (el live reload de ng serve) no pasan por Express: server.js los manda a
 * app.locals.upgrade.
 */
export function createApp({ config, fetch: fetchImpl = globalThis.fetch, log = (line) => console.log(line) }) {
  const app = express();
  // La gateway es el borde: la IP del cliente es la de la conexión, no la de X-Forwarded-For
  app.set("trust proxy", false);
  app.disable("x-powered-by");
  app.disable("etag");

  app.use(requestId);
  if (config.accessLog) app.use(accessLog(log));
  app.use(cleanHeaders);
  app.use(bodyLimit(config.maxBodyBytes));

  app.use("/gateway", healthRouter({ services: config.services, timeoutMs: config.healthTimeoutMs, fetch: fetchImpl }));

  // /api, /auth y /ai, cada uno a su servicio, sin reescribir la ruta. /health va a la API, como
  // en el proxy.conf.json del panel (su indicador de conexión lo usa)
  for (const service of Object.values(config.services)) app.use(serviceProxy(service));
  app.use(serviceProxy({ ...config.services.api, prefix: "/health" }));

  // El resto, al frontal de ese nombre: routly.localhost (web) o panel.routly.localhost (panel)
  const frontends = createFrontends(config.frontends);
  app.use(frontends.middleware);
  app.locals.upgrade = frontends.upgrade;

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
