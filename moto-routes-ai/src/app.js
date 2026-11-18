import express from "express";
import morgan from "morgan";
import { createRoutlyClient } from "./clients/routly.js";
import { helmetMiddleware } from "./config/helmet.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

/**
 * Monta el servidor de IA. La usan server.js (que solo arranca) y los tests, así que los tests
 * prueban la misma app que se ejecuta, sin copiarla.
 *
 * Todo lo de fuera llega por parámetro: la configuración (config/env.js) y fetch. En los tests,
 * fetch es uno falso que contesta como la API, OpenRouter u Open-Meteo, sin red.
 */
export function createApp({ config, fetch: fetchImpl = globalThis.fetch }) {
  const isProduction = config.env === "production";
  const clients = {
    routly: createRoutlyClient({ baseUrl: config.routlyApiUrl, fetch: fetchImpl, timeoutMs: config.upstreamTimeoutMs }),
  };

  const app = express();
  // Detrás de un proxy (o del API gateway): la IP del cliente para el límite de peticiones
  app.set("trust proxy", config.trustProxy === 0 ? false : config.trustProxy);
  app.disable("x-powered-by");

  app.use(helmetMiddleware(isProduction));
  if (config.env !== "test") app.use(morgan(isProduction ? "combined" : "dev"));
  // Lo más grande que llega es una conversación del chat (20 mensajes de 2.000 caracteres)
  app.use(express.json({ limit: "64kb" }));

  // ai: si hay clave de OpenRouter. Sin ella, el tiempo y las paradas funcionan igual
  app.get("/health", (req, res) => {
    res.json({ ok: true, ai: Boolean(config.ai.apiKey) });
  });

  // Todo lo del servidor de IA cuelga de /ai, igual que la API de /api: el proxy de la web (y el
  // futuro API gateway) solo tiene que mandar cada prefijo a su servidor
  const ai = express.Router();
  app.use("/ai", ai);

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.locals.clients = clients;
  return app;
}
