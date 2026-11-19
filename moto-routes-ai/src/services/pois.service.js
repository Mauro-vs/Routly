import { distanceKm } from "../utils/geo.js";

/*
 * De dónde salen los sitios (dónde comer, miradores y gasolineras): de Photon y, si falla, de
 * Overpass. Los dos leen OpenStreetMap; Photon responde en menos de un segundo y Overpass va a
 * menudo saturado, pero trae más datos (horario, cocina). Devuelven lo mismo: { type, id, lat,
 * lon, tags }.
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

/** Puntos del recorrido separados al menos SAMPLE_EVERY_KM (y como mucho MAX_SAMPLES, repartidos). */
export function samplePoints(points) {
  if (points.length <= 1) return points;
  const samples = [points[0]];
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    walked += distanceKm(points[i - 1], points[i]);
    if (walked >= SAMPLE_EVERY_KM) {
      samples.push(points[i]);
      walked = 0;
    }
  }
  const last = points.at(-1);
  if (samples.at(-1) !== last) samples.push(last);
  if (samples.length <= MAX_SAMPLES) return samples;
  const step = (samples.length - 1) / (MAX_SAMPLES - 1);
  return Array.from({ length: MAX_SAMPLES }, (_, index) => samples[Math.round(index * step)]);
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

export function createPoisService({ photon, overpass }) {
  // Todas las consultas a Photon: si fallan todas, Photon está caído; si falla alguna, se sigue con el resto
  async function photonAll(queries) {
    const results = await inBatches(queries.map(([point, what]) => () => photon.near(point, what)), CONCURRENCY);
    const ok = results.filter((result) => result.status === "fulfilled");
    if (ok.length === 0) throw results[0]?.reason ?? new Error("no queries");
    return unique(ok.flatMap((result) => result.value));
  }

  async function withFallback(fromPhoton, fromOverpass) {
    try {
      return await fromPhoton();
    } catch (error) {
      console.warn(`[places] Photon failed (${error.message}), trying Overpass`);
      return fromOverpass();
    }
  }

  return {
    /** Dónde comer, gasolineras y miradores alrededor de un punto. */
    around: (point) =>
      withFallback(
        () => photonAll(Object.values(AROUND).map((what) => [point, what])),
        () => overpass.around(point),
      ),

    /** Lo mismo a lo largo de un recorrido (points, en orden), mirando cada SAMPLE_EVERY_KM. */
    alongLine: (points) =>
      withFallback(
        () => photonAll(samplePoints(points).flatMap((point) => Object.values(ALONG).map((what) => [point, what]))),
        () => overpass.alongLine(points),
      ),
  };
}
