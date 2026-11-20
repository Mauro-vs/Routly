import { distanceKm } from "../utils/geo.js";

/*
 * De dónde salen los sitios (dónde comer, miradores y gasolineras): de Geoapify si hay clave
 * (GEOAPIFY_API_KEY), si no o si falla de Photon y, si también falla, de Overpass. Los tres leen
 * OpenStreetMap y devuelven lo mismo: { type, id, lat, lon, tags }. Geoapify pide una clave
 * gratuita y responde siempre; Photon y Overpass son gratis sin clave, pero a menudo no responden.
 */

/** Lo que se busca alrededor de la salida y la llegada (las paradas). */
export const AROUND = Object.freeze({
  food: { tags: ["amenity:restaurant", "amenity:cafe", "amenity:fast_food", "amenity:bar", "amenity:pub"], radiusKm: 3, limit: 40 },
  fuel: { tags: ["amenity:fuel"], radiusKm: 8, limit: 15 },
  viewpoint: { tags: ["tourism:viewpoint"], radiusKm: 15, limit: 15 },
});

/** Lo que se busca a lo largo del recorrido (el mapa), en cada punto de muestra: un círculo que llega
 * hasta el siguiente punto, para cubrir todo el tramo. Lo que quede lejos de la carretera lo quita
 * después services/routeMap.service.js (PLACES_RADIUS_KM). */
export const ALONG = Object.freeze({
  food: { tags: ["amenity:restaurant", "amenity:cafe"], radiusKm: 6, limit: 30 },
  viewpoint: { tags: ["tourism:viewpoint"], radiusKm: 6, limit: 10 },
  fuel: { tags: ["amenity:fuel"], radiusKm: 6, limit: 6 },
});

/** Cada cuántos km del recorrido se mira, y en cuántos puntos como mucho (un recorrido largo):
 * como mucho 8 × 3 = 24 consultas a Photon por recorrido, una vez cada 7 días. */
export const SAMPLE_EVERY_KM = 12;
export const MAX_SAMPLES = 8;
// Consultas a Photon a la vez: pocas, que si se le pregunta mucho de golpe deja de responder
const CONCURRENCY = 2;

/** Overpass mira con círculos más pequeños (LINE_RADIUS): puntos más juntos, en una sola consulta. */
export const OVERPASS_SAMPLE = Object.freeze({ everyKm: 4, max: 40 });

/** Puntos del recorrido separados al menos everyKm (y como mucho max, repartidos). */
export function samplePoints(points, { everyKm = SAMPLE_EVERY_KM, max = MAX_SAMPLES } = {}) {
  if (points.length <= 1) return points;
  const samples = [points[0]];
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    walked += distanceKm(points[i - 1], points[i]);
    if (walked >= everyKm) {
      samples.push(points[i]);
      walked = 0;
    }
  }
  const last = points.at(-1);
  if (samples.at(-1) !== last) samples.push(last);
  if (samples.length <= max) return samples;
  const step = (samples.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, index) => samples[Math.round(index * step)]);
}

// Ejecuta las tareas de pocas en pocas
async function inBatches(tasks, size) {
  const results = [];
  for (let i = 0; i < tasks.length; i += size) {
    results.push(...(await Promise.allSettled(tasks.slice(i, i + size).map((task) => task()))));
  }
  return results;
}

const unique = (elements) => [...new Map(elements.map((element) => [`${element.type}/${element.id}`, element])).values()];

export function createPoisService({ geoapify, photon, overpass }) {
  // Todas las consultas a un buscador por punto (Geoapify o Photon): si fallan todas, está caído; si
  // falla alguna, se sigue con el resto
  async function all(client, queries) {
    const results = await inBatches(queries.map(([point, what]) => () => client.near(point, what)), CONCURRENCY);
    const ok = results.filter((result) => result.status === "fulfilled");
    if (ok.length === 0) throw results[0]?.reason ?? new Error("no queries");
    return unique(ok.flatMap((result) => result.value));
  }

  // Geoapify (si hay clave), luego Photon y, si los dos fallan, Overpass
  async function firstThatWorks(queries, fromOverpass) {
    const sources = [...(geoapify?.enabled ? [["Geoapify", geoapify]] : []), ["Photon", photon]];
    for (const [name, client] of sources) {
      try {
        return await all(client, queries);
      } catch (error) {
        console.warn(`[places] ${name} failed (${error.message}), trying the next source`);
      }
    }
    return fromOverpass();
  }

  return {
    /** Dónde comer, gasolineras y miradores alrededor de un punto. */
    around: (point) =>
      firstThatWorks(
        Object.values(AROUND).map((what) => [point, what]),
        () => overpass.around(point),
      ),

    /** Lo mismo a lo largo de un recorrido (points, en orden), mirando cada SAMPLE_EVERY_KM. */
    alongLine: (points) =>
      firstThatWorks(
        samplePoints(points).flatMap((point) => Object.values(ALONG).map((what) => [point, what])),
        () => overpass.alongLine(samplePoints(points, OVERPASS_SAMPLE)),
      ),
  };
}
