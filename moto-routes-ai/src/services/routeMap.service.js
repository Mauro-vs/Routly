import { within } from "../utils/async.js";
import { notFound } from "../utils/errors.js";
import { distanceKm, pointKey, samePoint } from "../utils/geo.js";
import { createCache } from "./cache.js";

const DAY = 24 * 60 * 60 * 1000;

/** Cuánto se espera a los sitios. Si OpenStreetMap tarda más, el mapa sale sin ellos y la
 * búsqueda sigue: la web vuelve a pedirlo unos segundos después y ya están en la caché. */
export const PLACES_BUDGET_MS = 6000;
/** Cuántos sitios de cada tipo se enseñan como mucho, repartidos a lo largo del recorrido. */
export const PLACES_MAX = Object.freeze({ food: 36, viewpoint: 15, fuel: 10 });
/** A cuántos km del recorrido puede estar un sitio de cada tipo. */
export const PLACES_RADIUS_KM = Object.freeze({ food: 1.5, viewpoint: 3, fuel: 2 });
// La línea que se usa para buscar y medir: como mucho estos puntos (la del recorrido tiene miles)
const LINE_POINTS_FOR_SEARCH = 80;
// En cuántos tramos se parte el recorrido para repartir los sitios
const SECTIONS = 10;

const SOURCES = Object.freeze({
  map: { name: "OpenStreetMap", url: "https://www.openstreetmap.org/copyright", attribution: "© OpenStreetMap contributors" },
  route: { name: "OSRM", url: "https://project-osrm.org" },
});

// El tipo de cada sitio según su etiqueta de OpenStreetMap, o null si no es de los que se enseñan
function kindOf(tags) {
  if (tags.amenity === "restaurant" || tags.amenity === "cafe") return "food";
  if (tags.tourism === "viewpoint") return "viewpoint";
  if (tags.amenity === "fuel") return "fuel";
  return null;
}

const toPoint = ([latitude, longitude]) => ({ latitude, longitude });
const toPair = ({ latitude, longitude }) => [latitude, longitude];

// La línea con menos puntos, separados más o menos lo mismo (siempre con el primero y el último)
function thin(line, max) {
  if (line.length <= max) return line.map(toPoint);
  const step = (line.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, index) => toPoint(line[Math.round(index * step)]));
}

// El punto de la línea más cercano a un sitio: a qué distancia está y en qué tramo del recorrido
function closest(points, place) {
  let best = { index: 0, km: Infinity };
  for (const [index, point] of points.entries()) {
    const km = distanceKm(point, place);
    if (km < best.km) best = { index, km };
  }
  return best;
}

function toPlace(element, kind, points) {
  const { tags } = element;
  const near = closest(points, { latitude: element.lat, longitude: element.lon });
  return {
    kind,
    // Un mirador sin nombre se enseña igual ("Mirador"); un restaurante sin nombre, no
    name: tags.name ?? (kind === "fuel" ? tags.brand ?? null : null),
    category: kind === "food" ? tags.amenity : null,
    cuisine: tags.cuisine?.split(";").map((value) => value.trim().replaceAll("_", " ")) ?? [],
    openingHours: tags.opening_hours ?? null,
    website: tags.website ?? tags["contact:website"] ?? null,
    latitude: element.lat,
    longitude: element.lon,
    // Lo lejos que queda del recorrido (en línea recta) y por dónde cae, de 0 (salida) a 1 (llegada)
    distanceKm: Math.round(near.km * 10) / 10,
    position: points.length > 1 ? near.index / (points.length - 1) : 0,
    url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
  };
}

// Los más cercanos al recorrido de cada tramo, para que no salgan todos en la misma ciudad
function spread(places, max) {
  const perSection = Math.ceil(max / SECTIONS);
  const sections = Array.from({ length: SECTIONS }, () => []);
  for (const place of places) sections[Math.min(SECTIONS - 1, Math.floor(place.position * SECTIONS))].push(place);
  return sections.flatMap((list) => list.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, perSection));
}

/**
 * El mapa del detalle de una experiencia: el recorrido por carretera (OSRM) desde la salida, por
 * los puntos de paso de la ruta y hasta la llegada, y lo que hay a lo largo: dónde comer, miradores
 * y gasolineras (OpenStreetMap, por services/pois.service.js). No usa IA.
 *
 * - Si OSRM falla, la línea une los puntos en recto (routed: false) y no se guarda.
 * - Si los sitios tardan, places es null y placesStatus "loading"; si fallan, "unavailable". El
 *   recorrido se guarda 30 días y los sitios 7.
 */
export function createRouteMapService({ catalog, places, osrm, pois }) {
  const routes = createCache({ ttlMs: 30 * DAY, max: 300 });
  const found = createCache({ ttlMs: 7 * DAY, max: 300 });

  async function lineThrough(points) {
    const key = points.map(pointKey).join(";");
    try {
      return { ...(await routes.wrap(key, () => osrm.route(points))), routed: true };
    } catch (error) {
      console.warn(`[route] ${error.message}: drawing straight lines`);
      return { line: points.map(toPair), distanceKm: null, durationH: null, routed: false };
    }
  }

  function placesAlong(line) {
    const points = thin(line, LINE_POINTS_FOR_SEARCH);
    const key = points.map(pointKey).join(";");
    return found.wrap(key, async () => {
      const elements = await pois.alongLine(points);
      const byKind = { food: [], viewpoint: [], fuel: [] };
      for (const element of elements) {
        const kind = kindOf(element.tags);
        if (!kind) continue;
        const place = toPlace(element, kind, points);
        // Lo que ha salido de más lejos de lo que toca (Photon busca en círculos), fuera
        if (place.distanceKm > PLACES_RADIUS_KM[kind]) continue;
        if (kind === "food" && !place.name) continue;
        byKind[kind].push(place);
      }
      // Con un solo punto (ruta circular sin puntos de paso) no hay tramos: los más cercanos
      const pick = (list, max) =>
        points.length > 1 ? spread(list, max) : list.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, max);
      return Object.entries(byKind)
        .flatMap(([kind, list]) => pick(list, PLACES_MAX[kind]))
        .sort((a, b) => a.position - b.position)
        .map((place) => ({ ...place, position: Math.round(place.position * 100) / 100 }));
    });
  }

  return {
    async forExperience(slug) {
      const experience = await catalog.experience(slug);
      const route = experience.route;
      const [start, end] = await Promise.all([places.resolve(route?.startLocation), places.resolve(route?.endLocation)]);
      if (!start) throw notFound("Experience location");

      const waypoints = (route?.waypoints ?? []).filter(
        (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
      );
      const circular = !end || samePoint(start, end);
      const points = [start, ...waypoints, circular ? start : end];

      // Circular y sin puntos de paso: no hay recorrido que dibujar, solo la salida
      const path = waypoints.length > 0 || !circular ? await lineThrough(points) : null;
      const line = path?.line ?? [toPair(start)];

      const result = await within(
        placesAlong(line).then((list) => ({ list }), () => ({ failed: true })),
        PLACES_BUDGET_MS,
      );

      const place = ({ city, region, latitude, longitude }) => ({ city, region, latitude, longitude });
      return {
        start: place(start),
        end: circular ? null : place(end),
        waypoints: waypoints.map(({ name = null, latitude, longitude }) => ({ name, latitude, longitude })),
        line: path?.line ?? null,
        routed: path?.routed ?? false,
        distanceKm: path?.distanceKm ?? null,
        durationH: path?.durationH ?? null,
        places: result?.list ?? null,
        placesStatus: result?.list ? "ok" : result?.failed ? "unavailable" : "loading",
        placesRadiusKm: PLACES_RADIUS_KM,
        sources: SOURCES,
      };
    },
  };
}
