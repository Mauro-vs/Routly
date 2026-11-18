import { createCache } from "./cache.js";

/**
 * Lo que el servidor de IA lee de la API: una experiencia y sus salidas. Se guarda un minuto, así
 * que el tiempo, las paradas y los textos IA de un mismo detalle (que llegan casi a la vez) piden
 * la experiencia a la API una sola vez. Un minuto: si alguien la cambia en el panel, se ve enseguida.
 */
export function createCatalogService({ routly, ttlMs = 60_000 }) {
  const cache = createCache({ ttlMs, max: 200 });
  return {
    experience: (slug) => cache.wrap(`experience:${slug}`, () => routly.experience(slug)),
    departures: (slug) => cache.wrap(`departures:${slug}`, () => routly.departures(slug)),
  };
}
