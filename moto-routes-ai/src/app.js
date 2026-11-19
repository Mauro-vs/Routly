import express from "express";
import morgan from "morgan";
import { createOpenRouterClient } from "./clients/openrouter.js";
import { createOsrmClient } from "./clients/osrm.js";
import { createOverpassClient } from "./clients/overpass.js";
import { createPhotonClient } from "./clients/photon.js";
import { createRoutlyClient } from "./clients/routly.js";
import { createWeatherClient } from "./clients/weather.js";
import { helmetMiddleware } from "./config/helmet.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { chatRouter } from "./routes/chat.routes.js";
import { experiencesRouter } from "./routes/experiences.routes.js";
import { createCatalogService } from "./services/catalog.service.js";
import { createChatService } from "./services/chat.service.js";
import { createInsightsService } from "./services/insights.service.js";
import { createPlacesService } from "./services/places.service.js";
import { createPoisService } from "./services/pois.service.js";
import { createRouteMapService } from "./services/routeMap.service.js";
import { createStopsService } from "./services/stops.service.js";
import { createWeatherService } from "./services/weather.service.js";

/**
 * Monta el servidor de IA. La usan server.js (que solo arranca) y los tests, así que los tests
 * prueban la misma app que se ejecuta, sin copiarla.
 *
 * Todo lo de fuera llega por parámetro: la configuración (config/env.js) y fetch. En los tests,
 * fetch es uno falso que contesta como la API, OpenRouter u Open-Meteo, sin red.
 */
export function createApp({ config, fetch: fetchImpl = globalThis.fetch }) {
  const isProduction = config.env === "production";
  const upstream = { fetch: fetchImpl, timeoutMs: config.upstreamTimeoutMs };
  const clients = {
    routly: createRoutlyClient({ baseUrl: config.routlyApiUrl, ...upstream }),
    weather: createWeatherClient(upstream),
    overpass: createOverpassClient(upstream),
    osrm: createOsrmClient(upstream),
    photon: createPhotonClient(upstream),
    openRouter: createOpenRouterClient({ ...config.ai, fetch: fetchImpl }),
  };

  // Los services, cada uno con lo que necesita (sin variables globales: cada app tiene su caché)
  const catalog = createCatalogService({ routly: clients.routly });
  const places = createPlacesService({ weather: clients.weather });
  const weather = createWeatherService({ catalog, places, weather: clients.weather });
  const pois = createPoisService({ photon: clients.photon, overpass: clients.overpass });
  const stops = createStopsService({ catalog, places, pois });
  const services = {
    catalog,
    places,
    weather,
    stops,
    routeMap: createRouteMapService({ catalog, places, osrm: clients.osrm, pois }),
    insights: createInsightsService({ catalog, weather, stops, openRouter: clients.openRouter }),
  };
  // El chatbot usa las herramientas, que tiran de los demás services y de la API
  services.chat = createChatService({ openRouter: clients.openRouter, services: { ...services, routly: clients.routly } });

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
  ai.use("/experiences", experiencesRouter(services));
  ai.use("/chat", chatRouter(services));

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.locals.services = services;
  return app;
}
