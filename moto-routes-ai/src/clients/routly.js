import { notFound, upstreamError } from "../utils/errors.js";
import { requestJson } from "../utils/http.js";

const SERVICE = "Routly API";

/**
 * La API de Routly vista desde el servidor de IA: solo la tienda pública (/api/shop), sin sesión.
 * Así la IA ve lo mismo que cualquier visitante: nada oculto, nada borrado y ningún dato privado.
 * El servidor de IA nunca toca MongoDB.
 *
 * Cada método devuelve el "data" de la respuesta (el listado, { data, pagination }).
 */
export function createRoutlyClient({ baseUrl, fetch: fetchImpl, timeoutMs }) {
  async function get(path, params = {}, { resource } = {}) {
    const url = new URL(`${baseUrl}/shop${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
    const { status, body } = await requestJson(fetchImpl, url, { service: SERVICE, timeoutMs });
    if (status === 404 && resource) throw notFound(resource);
    if (status < 200 || status >= 300) throw upstreamError(SERVICE, { status });
    return body;
  }

  const slugPath = (slug) => encodeURIComponent(slug);

  return {
    /** El detalle: la experiencia con su ruta, anfitrión, moto del guía, precio desde y galería. */
    async experience(slug) {
      return (await get(`/experiences/${slugPath(slug)}`, {}, { resource: "Experience" })).data;
    },
    /** Las salidas reservables, de la más próxima a la más lejana. */
    async departures(slug) {
      return (await get(`/experiences/${slugPath(slug)}/departures`, {}, { resource: "Experience" })).data;
    },
    /** El Shop: { data, pagination }, con los filtros de /api/shop/experiences. */
    async experiences(query = {}) {
      return get("/experiences", query);
    },
    /** La ficha pública de un guía (anfitrión), con sus notas y sus experiencias. */
    async host(slug) {
      return (await get(`/hosts/${slugPath(slug)}`, {}, { resource: "Host" })).data;
    },
    /**
     * Una página de las opiniones visibles de una experiencia (type "experience") o de un guía
     * ("host"): { data, pagination, summary }, con los filtros de la tienda (sort, page, limit...).
     */
    async reviews(type, slug, query = {}) {
      const [base, resource] = type === "host" ? ["hosts", "Host"] : ["experiences", "Experience"];
      return get(`/${base}/${slugPath(slug)}/reviews`, query, { resource });
    },
    async categories(limit = 50) {
      return (await get("/categories", { limit })).data;
    },
    async locations(limit = 50) {
      return (await get("/locations", { limit })).data;
    },
  };
}
