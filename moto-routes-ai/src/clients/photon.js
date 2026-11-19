import { upstreamError } from "../utils/errors.js";
import { requestJson } from "../utils/http.js";

/*
 * Photon (https://photon.komoot.io): un buscador sobre los datos de OpenStreetMap. Su reverse con
 * filtro de etiqueta (osm_tag) da los sitios de un tipo más cercanos a un punto, ordenados por
 * distancia, en menos de un segundo. Gratis y sin clave, para un uso moderado (si se le pregunta
 * mucho de golpe, deja de responder un rato): lo que devuelve se guarda 7 días y, si falla, no se le
 * vuelve a preguntar en DOWN_FOR_MS. Trae el nombre y el tipo, pero no el horario ni la cocina
 * (Overpass sí).
 */
const SERVICE = "Photon";
export const PHOTON_URL = "https://photon.komoot.io/reverse";
const USER_AGENT = "Routly/1.0 (proyecto educativo de 2º DAW; moto-routes-ai)";
/** Photon no devuelve más de 50 por consulta. */
export const PHOTON_MAX_LIMIT = 50;
/** Sano responde en menos de un segundo: si tarda más de esto, no va a responder. */
export const PHOTON_TIMEOUT_MS = 5000;
/** Si no responde, o responde que está saturado, cuánto tiempo se da por caído sin volver a preguntar. */
export const DOWN_FOR_MS = 2 * 60 * 1000;

const OSM_TYPES = { N: "node", W: "way", R: "relation" };

export function createPhotonClient({ fetch: fetchImpl, timeoutMs, url = PHOTON_URL, now = Date.now }) {
  // Caído, cada consulta tardaría el tiempo máximo en fallar (y un recorrido hace muchas): un rato sin preguntar
  let downUntil = 0;
  const down = (error) => {
    downUntil = now() + DOWN_FOR_MS;
    return error;
  };

  return {
    /**
     * Los sitios con alguna de las etiquetas (["amenity:restaurant", ...]) a menos de radiusKm del
     * punto, del más cercano al más lejano. Con la misma forma que los de Overpass:
     * { type, id, lat, lon, tags }.
     */
    async near({ latitude, longitude }, { tags, radiusKm, limit }) {
      const target = new URL(url);
      target.searchParams.set("lat", String(latitude));
      target.searchParams.set("lon", String(longitude));
      target.searchParams.set("radius", String(radiusKm));
      target.searchParams.set("limit", String(Math.min(limit, PHOTON_MAX_LIMIT)));
      for (const tag of tags) target.searchParams.append("osm_tag", tag);

      if (now() < downUntil) throw upstreamError(SERVICE, { status: 503 });
      let response;
      try {
        response = await requestJson(fetchImpl, target, {
          service: SERVICE,
          timeoutMs: Math.min(timeoutMs, PHOTON_TIMEOUT_MS),
          headers: { "user-agent": USER_AGENT },
        });
      } catch (error) {
        throw down(error);
      }
      const { status, body } = response;
      // 429 (demasiadas peticiones) o 5xx: caído un rato; un 4xx de otro tipo es de esta consulta
      if (status === 429 || status >= 500) throw down(upstreamError(SERVICE, { status }));
      if (status !== 200 || !Array.isArray(body?.features)) throw upstreamError(SERVICE, { status });

      return body.features
        .map(({ geometry, properties = {} }) => ({
          type: OSM_TYPES[properties.osm_type] ?? "node",
          id: properties.osm_id,
          lat: geometry?.coordinates?.[1],
          lon: geometry?.coordinates?.[0],
          tags: {
            [properties.osm_key]: properties.osm_value,
            ...(properties.name && { name: properties.name }),
          },
        }))
        .filter((element) => element.id && Number.isFinite(element.lat) && Number.isFinite(element.lon));
    },
  };
}
