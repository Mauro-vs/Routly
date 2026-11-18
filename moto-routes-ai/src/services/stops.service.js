import { distanceKm, pointKey, samePoint } from "../utils/geo.js";
import { notFound } from "../utils/errors.js";
import { createCache } from "./cache.js";

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Cuántos sitios de cada tipo se enseñan por punto. */
export const STOPS_PER_KIND = 5;

const FOOD = new Set(["restaurant", "cafe", "fast_food", "bar", "pub"]);

// Cada elemento de OpenStreetMap como un sitio de la lista, o null si no es de ningún tipo
function toStop(element, point) {
  const { tags } = element;
  let kind = null;
  if (FOOD.has(tags.amenity)) kind = "food";
  else if (tags.amenity === "fuel") kind = "fuel";
  else if (tags.tourism === "viewpoint") kind = "viewpoint";
  if (!kind) return null;

  const name = tags.name ?? (kind === "fuel" ? tags.brand ?? tags.operator : null) ?? null;
  return {
    kind,
    name,
    // restaurant, cafe... (comida); la marca (gasolinera)
    category: kind === "food" ? tags.amenity : null,
    cuisine: tags.cuisine?.split(";").map((value) => value.trim().replaceAll("_", " ")) ?? [],
    brand: kind === "fuel" ? tags.brand ?? null : null,
    openingHours: tags.opening_hours ?? null,
    website: tags.website ?? tags["contact:website"] ?? null,
    latitude: element.lat,
    longitude: element.lon,
    distanceKm: Math.round(distanceKm(point, { latitude: element.lat, longitude: element.lon }) * 10) / 10,
    url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
  };
}

// Los más cercanos de un tipo; primero los que tienen nombre (un mirador sin nombre dice poco)
function nearest(stops, kind) {
  return stops
    .filter((stop) => stop.kind === kind)
    .sort((a, b) => Number(b.name !== null) - Number(a.name !== null) || a.distanceKm - b.distanceKm)
    .slice(0, STOPS_PER_KIND)
    .map(({ kind: _kind, ...stop }) => stop);
}

/**
 * Paradas reales cerca de la salida y de la llegada de una experiencia: dónde comer, gasolineras y
 * miradores, de OpenStreetMap. No usa IA. Se guardan 7 días por punto (redondeado a ~1 km).
 *
 * En una ruta circular (o si salida y llegada están a menos de 500 m) solo viene start.
 */
export function createStopsService({ catalog, places, overpass }) {
  const cache = createCache({ ttlMs: WEEK, max: 500 });

  async function around(place) {
    const elements = await cache.wrap(pointKey(place), () => overpass.around(place));
    const stops = elements.map((element) => toStop(element, place)).filter(Boolean);
    return { place, food: nearest(stops, "food"), fuel: nearest(stops, "fuel"), viewpoints: nearest(stops, "viewpoint") };
  }

  return {
    async forExperience(slug) {
      const experience = await catalog.experience(slug);
      const [start, end] = await Promise.all([
        places.resolve(experience.route?.startLocation),
        places.resolve(experience.route?.endLocation),
      ]);
      if (!start) throw notFound("Experience location");
      const circular = !end || samePoint(start, end);
      const [startStops, endStops] = await Promise.all([around(start), circular ? null : around(end)]);
      return {
        start: startStops,
        end: endStops,
        source: { name: "OpenStreetMap", url: "https://www.openstreetmap.org/copyright", attribution: "© OpenStreetMap contributors" },
      };
    },
  };
}
