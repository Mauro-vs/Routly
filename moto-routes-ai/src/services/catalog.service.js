import { createCache } from "./cache.js";

/** Cuántas opiniones da la API por página como mucho (SHOP_REVIEWS_LIMIT.max en la API) */
export const REVIEWS_PAGE_SIZE = 20;

/**
 * Lo que el servidor de IA lee de la API: una experiencia y sus salidas, un guía y las opiniones.
 * Se guarda un minuto, así que el tiempo, las paradas y los textos IA de un mismo detalle (que
 * llegan casi a la vez) piden la experiencia a la API una sola vez. Un minuto: si alguien la cambia
 * en el panel, se ve enseguida.
 */
export function createCatalogService({ routly, ttlMs = 60_000 }) {
  const cache = createCache({ ttlMs, max: 200 });

  /**
   * Las max opiniones más recientes, página a página (la API da 20 como mucho por página), con el
   * resumen de todas (media, cuántas y el reparto por estrellas): { reviews, summary }.
   */
  async function readRecentReviews(type, slug, max) {
    const reviews = [];
    let summary = null;
    for (let page = 1; reviews.length < max; page++) {
      const result = await routly.reviews(type, slug, { sort: "recent", page, limit: REVIEWS_PAGE_SIZE });
      summary ??= result.summary ?? null;
      reviews.push(...result.data);
      if (page >= (result.pagination?.totalPages ?? 0) || result.data.length === 0) break;
    }
    return { reviews: reviews.slice(0, max), summary };
  }

  return {
    experience: (slug) => cache.wrap(`experience:${slug}`, () => routly.experience(slug)),
    departures: (slug) => cache.wrap(`departures:${slug}`, () => routly.departures(slug)),
    host: (slug) => cache.wrap(`host:${slug}`, () => routly.host(slug)),
    recentReviews: (type, slug, max = 100) =>
      cache.wrap(`reviews:${type}:${slug}:${max}`, () => readRecentReviews(type, slug, max)),
  };
}
