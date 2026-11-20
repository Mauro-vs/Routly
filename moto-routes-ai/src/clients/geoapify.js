import { upstreamError } from "../utils/errors.js";
import { requestJson } from "../utils/http.js";

/*
 * Geoapify Places (https://www.geoapify.com): los sitios de OpenStreetMap de un tipo alrededor de un
 * punto, del más cercano al más lejano. Pide una clave gratuita (3000 peticiones al día, sin tarjeta)
 * y, a cambio, responde siempre y rápido, al revés que Photon y Overpass (gratis sin clave, pero a
 * menudo saturados). Trae las etiquetas de OpenStreetMap tal cual (horario, cocina, web).
 */
const SERVICE = "Geoapify";
export const GEOAPIFY_URL = "https://api.geoapify.com/v2/places";
export const GEOAPIFY_MAX_LIMIT = 100;
const TIMEOUT_MS = 8000;
/** Si falla (o se acaba la cuota del día), cuánto tiempo se da por caído sin volver a preguntar. */
export const DOWN_FOR_MS = 5 * 60 * 1000;

/** Las etiquetas de OpenStreetMap que se piden (como en Photon) y su categoría en Geoapify. */
export const CATEGORIES = Object.freeze({
  "amenity:restaurant": "catering.restaurant",
  "amenity:cafe": "catering.cafe",
  "amenity:fast_food": "catering.fast_food",
  "amenity:bar": "catering.bar",
  "amenity:pub": "catering.pub",
  "amenity:fuel": "service.vehicle.fuel",
  "tourism:viewpoint": "tourism.attraction.viewpoint",
});

const OSM_TYPES = { n: "node", w: "way", r: "relation" };

// La etiqueta de OpenStreetMap del sitio: la de su categoría más concreta de las pedidas
function tagOf(categories, wanted) {
  const match = wanted.find((tag) => categories.some((category) => category === CATEGORIES[tag] || category.startsWith(`${CATEGORIES[tag]}.`)));
  const [key, value] = (match ?? wanted[0]).split(":");
  return { [key]: value };
}

export function createGeoapifyClient({ fetch: fetchImpl, timeoutMs, apiKey, url = GEOAPIFY_URL, now = Date.now }) {
  let downUntil = 0;
  const down = (error) => {
    downUntil = now() + DOWN_FOR_MS;
    return error;
  };

  return {
    /** Sin clave no se usa: se pasa directamente a Photon. */
    enabled: Boolean(apiKey),

    /**
     * Los sitios con alguna de las etiquetas (["amenity:restaurant", ...]) a menos de radiusKm del
     * punto, del más cercano al más lejano: { type, id, lat, lon, tags }, como Photon y Overpass.
     */
    async near({ latitude, longitude }, { tags, radiusKm, limit }) {
      if (!apiKey) throw upstreamError(SERVICE, { status: 503 });
      if (now() < downUntil) throw upstreamError(SERVICE, { status: 503 });
      const target = new URL(url);
      target.searchParams.set("categories", tags.map((tag) => CATEGORIES[tag]).filter(Boolean).join(","));
      target.searchParams.set("filter", `circle:${longitude},${latitude},${Math.round(radiusKm * 1000)}`);
      target.searchParams.set("bias", `proximity:${longitude},${latitude}`);
      target.searchParams.set("limit", String(Math.min(limit, GEOAPIFY_MAX_LIMIT)));
      target.searchParams.set("lang", "es");
      target.searchParams.set("apiKey", apiKey);

      let response;
      try {
        response = await requestJson(fetchImpl, target, { service: SERVICE, timeoutMs: Math.min(timeoutMs, TIMEOUT_MS) });
      } catch (error) {
        throw down(error);
      }
      const { status, body } = response;
      // 401 (clave mala), 429 (cuota del día) o 5xx: un rato sin preguntar
      if (status === 401 || status === 429 || status >= 500) throw down(upstreamError(SERVICE, { status }));
      if (status !== 200 || !Array.isArray(body?.features)) throw upstreamError(SERVICE, { status });

      return body.features
        .map(({ geometry, properties = {} }) => {
          const raw = properties.datasource?.raw ?? {};
          const name = raw.name ?? properties.name;
          return {
            type: OSM_TYPES[raw.osm_type] ?? "node",
            id: raw.osm_id ?? properties.place_id,
            lat: geometry?.coordinates?.[1] ?? properties.lat,
            lon: geometry?.coordinates?.[0] ?? properties.lon,
            tags: {
              ...raw,
              ...tagOf(properties.categories ?? [], tags),
              ...(name && { name }),
            },
          };
        })
        .filter((element) => element.id && Number.isFinite(element.lat) && Number.isFinite(element.lon));
    },
  };
}
