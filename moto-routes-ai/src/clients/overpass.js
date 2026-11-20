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

// Cada tipo se saca por separado: con un solo "out" para todo, los restaurantes de una ciudad
// llenan el límite y los miradores y gasolineras se quedan fuera
function byKind({ food, viewpoint, fuel }, foodMax) {
  return `(${food})->.food;
(${viewpoint})->.viewpoint;
(${fuel})->.fuel;
.viewpoint out center tags 100;
.fuel out center tags 100;
.food out center tags ${foodMax};`;
}

// Una sola consulta por punto: comida con nombre, gasolineras y miradores
function query({ latitude, longitude }) {
  const around = (meters) => `(around:${meters},${latitude},${longitude})`;
  return `[out:json][timeout:15];
${byKind(
  {
    food: `nwr["amenity"~"^(restaurant|cafe|fast_food|bar|pub)$"]["name"]${around(STOP_RADIUS.food)};`,
    viewpoint: `nwr["tourism"="viewpoint"]${around(STOP_RADIUS.viewpoint)};`,
    fuel: `nwr["amenity"="fuel"]${around(STOP_RADIUS.fuel)};`,
  },
  150,
)}`;
}

// Un recorrido entero pide más que un punto: se le da algo más de tiempo
const LINE_TIMEOUT_MS = 25_000;

/** A cuántos metros de cada punto de muestra del recorrido se busca cada tipo en el mapa. */
export const LINE_RADIUS = Object.freeze({ food: 2500, viewpoint: 4000, fuel: 3000 });

// Dónde comer con nombre, miradores y gasolineras alrededor de puntos del recorrido. Un círculo por
// punto: un "around" con la línea entera (muchos puntos) es mucho más lento y Overpass no llega
function lineQuery(points) {
  const each = (filter, meters) =>
    points.map(({ latitude, longitude }) => `nwr${filter}(around:${meters},${latitude},${longitude});`).join("\n");
  return `[out:json][timeout:25];
${byKind(
  {
    food: each(`["amenity"~"^(restaurant|cafe)$"]["name"]`, LINE_RADIUS.food),
    viewpoint: each(`["tourism"="viewpoint"]`, LINE_RADIUS.viewpoint),
    fuel: each(`["amenity"="fuel"]`, LINE_RADIUS.fuel),
  },
  400,
)}`;
}

const toElements = (body) =>
  (body.elements ?? [])
    .map((element) => ({
      type: element.type,
      id: element.id,
      // Las vías y relaciones traen el centro (out center); los nodos, su punto
      lat: element.lat ?? element.center?.lat,
      lon: element.lon ?? element.center?.lon,
      tags: element.tags ?? {},
    }))
    .filter((element) => Number.isFinite(element.lat) && Number.isFinite(element.lon));

/** Si fallan todos los servidores, cuánto tiempo se da por caído sin volver a preguntar. */
export const DOWN_FOR_MS = 2 * 60 * 1000;

export function createOverpassClient({ fetch: fetchImpl, timeoutMs, urls = [OVERPASS_URL, ...OVERPASS_MIRRORS], now = Date.now }) {
  const wait = Math.max(timeoutMs, MIN_TIMEOUT_MS);
  // Con todos los servidores caídos, cada petición tardaría medio minuto en fallar: un rato sin preguntar
  let downUntil = 0;

  async function ask(url, data, waitMs) {
    const { status, body } = await requestJson(fetchImpl, url, {
      service: SERVICE,
      timeoutMs: waitMs,
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": USER_AGENT },
      body: new URLSearchParams({ data }).toString(),
    });
    // 429 y 504 son habituales en Overpass cuando está cargado
    if (status !== 200 || !body) throw upstreamError(SERVICE, { status });
    return body;
  }

  // Cada servidor por orden: si uno va saturado o no responde, el siguiente; si era el último, el error
  async function run(data, waitMs = wait) {
    if (now() < downUntil) throw upstreamError(SERVICE, { status: 503 });
    for (const [index, url] of urls.entries()) {
      try {
        return toElements(await ask(url, data, waitMs));
      } catch (error) {
        if (index === urls.length - 1) {
          downUntil = now() + DOWN_FOR_MS;
          throw error;
        }
        console.warn(`[OpenStreetMap] ${new URL(url).host} failed (${error.message}), trying ${new URL(urls[index + 1]).host}`);
      }
    }
  }

  return {
    /** Los elementos de OpenStreetMap cerca del punto: { type, id, lat, lon, tags }. */
    around: (point) => run(query(point)),

    /** Dónde comer, miradores y gasolineras alrededor de los puntos de un recorrido (a menos de LINE_RADIUS). */
    alongLine: (points) => run(lineQuery(points), Math.max(wait, LINE_TIMEOUT_MS)),
  };
}
