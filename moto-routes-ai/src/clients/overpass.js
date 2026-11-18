import { upstreamError } from "../utils/errors.js";
import { requestJson } from "../utils/http.js";

/*
 * OpenStreetMap a través de Overpass (https://overpass-api.de): sitios reales cerca de un punto.
 * Es gratis y pide un User-Agent que diga quién pregunta y un uso moderado; por eso lo que
 * devuelve se guarda 7 días (services/stops.service.js).
 */
const SERVICE = "OpenStreetMap";
export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "Routly/1.0 (proyecto educativo de 2º DAW; moto-routes-ai)";

/** Cuánto alrededor del punto se busca cada cosa, en metros. */
export const STOP_RADIUS = Object.freeze({ food: 3000, fuel: 8000, viewpoint: 15000 });

// Una sola consulta por punto: comida con nombre, gasolineras y miradores
function query({ latitude, longitude }) {
  const around = (meters) => `(around:${meters},${latitude},${longitude})`;
  return `[out:json][timeout:25];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|bar|pub)$"]["name"]${around(STOP_RADIUS.food)};
  nwr["amenity"="fuel"]${around(STOP_RADIUS.fuel)};
  nwr["tourism"="viewpoint"]${around(STOP_RADIUS.viewpoint)};
);
out center tags 300;`;
}

export function createOverpassClient({ fetch: fetchImpl, timeoutMs, url = OVERPASS_URL }) {
  return {
    /** Los elementos de OpenStreetMap cerca del punto: { type, id, lat, lon, tags }. */
    async around(point) {
      const { status, body } = await requestJson(fetchImpl, url, {
        service: SERVICE,
        timeoutMs,
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": USER_AGENT },
        body: new URLSearchParams({ data: query(point) }).toString(),
      });
      // 429 y 504 son habituales en Overpass cuando está cargado
      if (status !== 200 || !body) throw upstreamError(SERVICE, { status });
      return (body.elements ?? [])
        .map((element) => ({
          type: element.type,
          id: element.id,
          // Las vías y relaciones traen el centro (out center); los nodos, su punto
          lat: element.lat ?? element.center?.lat,
          lon: element.lon ?? element.center?.lon,
          tags: element.tags ?? {},
        }))
        .filter((element) => Number.isFinite(element.lat) && Number.isFinite(element.lon));
    },
  };
}
