import { upstreamError } from "../utils/errors.js";
import { requestJson } from "../utils/http.js";

/*
 * OpenStreetMap a través de Overpass (https://overpass-api.de): sitios reales cerca de un punto.
 * Es gratis y pide un User-Agent que diga quién pregunta y un uso moderado; por eso lo que
 * devuelve se guarda 7 días (services/stops.service.js).
 */
const SERVICE = "OpenStreetMap";
export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
// Otros servidores de Overpass con los mismos datos, por si el principal va saturado
export const OVERPASS_MIRRORS = ["https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
// Overpass tarda más que el resto de servicios; si un servidor no responde en este tiempo, se pasa
// al siguiente (sano responde en 1-5 s)
const MIN_TIMEOUT_MS = 15_000;
const USER_AGENT = "Routly/1.0 (proyecto educativo de 2º DAW; moto-routes-ai)";

/** Cuánto alrededor del punto se busca cada cosa, en metros. */
export const STOP_RADIUS = Object.freeze({ food: 3000, fuel: 8000, viewpoint: 15000 });

// Una sola consulta por punto: comida con nombre, gasolineras y miradores
function query({ latitude, longitude }) {
  const around = (meters) => `(around:${meters},${latitude},${longitude})`;
  return `[out:json][timeout:15];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|bar|pub)$"]["name"]${around(STOP_RADIUS.food)};
  nwr["amenity"="fuel"]${around(STOP_RADIUS.fuel)};
  nwr["tourism"="viewpoint"]${around(STOP_RADIUS.viewpoint)};
);
out center tags 300;`;
}

/** Si fallan todos los servidores, cuánto tiempo se da por caído sin volver a preguntar. */
export const DOWN_FOR_MS = 2 * 60 * 1000;

export function createOverpassClient({ fetch: fetchImpl, timeoutMs, urls = [OVERPASS_URL, ...OVERPASS_MIRRORS], now = Date.now }) {
  const wait = Math.max(timeoutMs, MIN_TIMEOUT_MS);
  // Con todos los servidores caídos, cada petición tardaría medio minuto en fallar: un rato sin preguntar
  let downUntil = 0;

  async function ask(url, point) {
    const { status, body } = await requestJson(fetchImpl, url, {
      service: SERVICE,
      timeoutMs: wait,
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": USER_AGENT },
      body: new URLSearchParams({ data: query(point) }).toString(),
    });
    // 429 y 504 son habituales en Overpass cuando está cargado
    if (status !== 200 || !body) throw upstreamError(SERVICE, { status });
    return body;
  }

  return {
    /** Los elementos de OpenStreetMap cerca del punto: { type, id, lat, lon, tags }. */
    async around(point) {
      if (now() < downUntil) throw upstreamError(SERVICE, { status: 503 });
      let body;
      for (const [index, url] of urls.entries()) {
        try {
          body = await ask(url, point);
          break;
        } catch (error) {
          // Saturado o sin respuesta: se prueba el siguiente servidor; si era el último, el error
          if (index === urls.length - 1) {
            downUntil = now() + DOWN_FOR_MS;
            throw error;
          }
          console.warn(`[OpenStreetMap] ${new URL(url).host} failed (${error.message}), trying ${new URL(urls[index + 1]).host}`);
        }
      }
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
