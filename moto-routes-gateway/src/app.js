import express from "express";
import { createRemoteJWKSet } from "jose";
import { accessLog } from "./middlewares/accessLog.js";
import { bodyLimit } from "./middlewares/bodyLimit.js";
import { cleanHeaders } from "./middlewares/cleanHeaders.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { gateAuth } from "./middlewares/gateAuth.js";
import { createLimiter, isCostlyAi } from "./middlewares/rateLimit.js";
import { requestId } from "./middlewares/requestId.js";
import { createFrontends } from "./proxy/frontends.js";
import { matchesPrefix, serviceProxy } from "./proxy/serviceProxy.js";
import { healthRouter } from "./routes/health.js";

/**
 * Monta la gateway. La usan server.js (que solo arranca) y los tests, así que los tests prueban
 * la misma app que se ejecuta, sin copiarla.
 *
 * Todo lo de fuera llega por parámetro: la configuración (config/env.js), fetch (para
 * /gateway/ready), las claves con las que se comprueban los tokens (por defecto, el JWKS de auth,
 * con caché) y dónde se escribe el registro.
 *
 * Orden: id de la petición → registro → cabeceras propias (HSTS) → limpiar cabeceras → tope del
 * cuerpo → salud propia → [límites → token en la puerta → el servicio por prefijo] → el frontal
 * de ese Host (web o panel) → error. Nada lee el cuerpo (sin express.json): se reenvía en
 * streaming.
 *
 * Los WebSocket (el live reload de ng serve) no pasan por Express: server.js los manda a
 * app.locals.upgrade.
 */
export function createApp({
  config,
  fetch: fetchImpl = globalThis.fetch,
  keys = createRemoteJWKSet(new URL(config.auth.jwksUrl), {
    // Se descarga una vez y se guarda; con un kid nuevo (clave rotada) se vuelve a pedir, como
    // mucho cada 30 s. Si auth no contesta en 5 s, 503 (o pasa, si la ruta es pública)
    timeoutDuration: 5_000,
    cooldownDuration: 30_000,
    cacheMaxAge: 10 * 60_000,
  }),
  log = (line) => console.log(line),
}) {
  const app = express();
  // La gateway es el borde: la IP del cliente es la de la conexión, no la de X-Forwarded-For
  app.set("trust proxy", false);
  app.disable("x-powered-by");
  app.disable("etag");

  app.use(requestId);
  if (config.accessLog) app.use(accessLog(log));
  if (config.hsts) {
    app.use((req, res, next) => {
      res.setHeader("strict-transport-security", "max-age=15552000; includeSubDomains");
      next();
    });
  }
  app.use(cleanHeaders);
  app.use(bodyLimit(config.maxBodyBytes));

  app.use("/gateway", healthRouter({ services: config.services, timeoutMs: config.healthTimeoutMs, fetch: fetchImpl }));

  // Lo de los servicios pasa por los límites y por la puerta del token. Los frontales (sus
  // archivos y el live reload) y /health, no
  const toService = (req) => Object.values(config.services).some(({ prefix }) => matchesPrefix(req.path, prefix));
  const general = createLimiter(config.rateLimits.general);
  const ai = createLimiter(config.rateLimits.ai);
  const gate = gateAuth({ keys, ...config.auth });
  app.use((req, res, next) => (toService(req) ? general(req, res, next) : next()));
  app.use((req, res, next) => (isCostlyAi(req) ? ai(req, res, next) : next()));
  app.use((req, res, next) => (toService(req) ? gate(req, res, next) : next()));

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
