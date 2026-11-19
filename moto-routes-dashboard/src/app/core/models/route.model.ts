import { CategorySummary } from './category.model';
import { BaseEntity } from './entity.model';
import { ImageSummary } from './image.model';
import { LocationSummary } from './location.model';

export type RouteDifficulty = 'easy' | 'medium' | 'hard';

/** Punto por el que pasa la ruta entre el origen y el destino, en orden. */
export interface RouteWaypoint {
  name?: string;
  latitude: number;
  longitude: number;
}

/**
 * Ruta en moto, tal como la devuelve `GET /api/routes`: con los ids de sus relaciones
 * y, además, los documentos relacionados.
 *
 * Las relaciones pueden llegar a `null` en una ruta de la papelera: si después de
 * eliminarla se elimina también su categoría o una de sus ubicaciones, la API ya no
 * las encuentra. Por eso se leen siempre con `routeTrip` y `categoryName`.
 */
export interface Route extends BaseEntity {
  title: string;
  description?: string;
  difficulty: RouteDifficulty;
  /** Kilómetros. */
  distance: number;
  /** Horas. */
  duration: number;
  categoryId: string;
  category: CategorySummary | null;
  startLocationId: string;
  startLocation: LocationSummary | null;
  /** Puede ser la misma que el origen: ruta circular. */
  endLocationId: string;
  endLocation: LocationSummary | null;
  /** Puntos de paso, en orden. Con ellos el mapa dibuja el recorrido. */
  waypoints?: RouteWaypoint[];
  /** Portada. La papelera no la trae. */
  coverImage?: ImageSummary | null;
}

/** Cuerpo de `POST /api/routes` y, con campos opcionales, de `PATCH /api/routes/:id`. */
export interface RoutePayload {
  title: string;
  description?: string | null;
  difficulty: RouteDifficulty;
  distance: number;
  duration: number;
  categoryId: string;
  startLocationId: string;
  endLocationId: string;
  /** null en un PATCH los quita. */
  waypoints?: RouteWaypoint[] | null;
}

/** Los mismos límites que la API (ROUTE_LIMITS en route.model.js). Distancia en km y duración en horas. */
export const ROUTE_LIMITS = {
  titleMin: 2,
  title: 120,
  description: 500,
  distance: 5000,
  duration: 240,
  waypointsMax: 20,
  waypointName: 80,
} as const;

/** Los puntos de paso como texto: una línea por punto, `Nombre, latitud, longitud`. */
export function formatWaypoints(waypoints: readonly RouteWaypoint[] | undefined): string {
  return (waypoints ?? [])
    .map(({ name, latitude, longitude }) => [name, latitude, longitude].filter((part) => part !== undefined).join(', '))
    .join('\n');
}

export type WaypointsParse =
  | { ok: true; waypoints: RouteWaypoint[] }
  | { ok: false; line: number; reason: string };

/**
 * Lee el texto de los puntos de paso. Cada línea no vacía es `latitud, longitud` o
 * `Nombre, latitud, longitud`; el nombre puede llevar comas, los dos números van al final.
 */
export function parseWaypoints(text: string): WaypointsParse {
  const lines = text.split('\n').map((line) => line.trim());
  const waypoints: RouteWaypoint[] = [];

  for (const [index, line] of lines.entries()) {
    if (!line) continue;
    const fail = (reason: string): WaypointsParse => ({ ok: false, line: index + 1, reason });
    const parts = line.split(',').map((part) => part.trim());
    if (parts.length < 2) return fail('escribe la latitud y la longitud separadas por una coma');

    const longitude = Number(parts.pop());
    const latitude = Number(parts.pop());
    const name = parts.join(', ').trim();
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return fail('la latitud y la longitud tienen que ser números');
    if (Math.abs(latitude) > 90) return fail('la latitud va de -90 a 90');
    if (Math.abs(longitude) > 180) return fail('la longitud va de -180 a 180');
    if (name.length > ROUTE_LIMITS.waypointName) return fail(`el nombre tiene como mucho ${ROUTE_LIMITS.waypointName} caracteres`);

    waypoints.push(name ? { name, latitude, longitude } : { latitude, longitude });
  }

  if (waypoints.length > ROUTE_LIMITS.waypointsMax) {
    return { ok: false, line: 0, reason: `como mucho ${ROUTE_LIMITS.waypointsMax} puntos` };
  }
  return { ok: true, waypoints };
}

export const DIFFICULTY_LABELS: Record<RouteDifficulty, string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
};

export const DIFFICULTIES: readonly RouteDifficulty[] = ['easy', 'medium', 'hard'];

/** Variante de `.badge` con la que se pinta cada dificultad. */
export const DIFFICULTY_BADGES: Record<RouteDifficulty, string> = {
  easy: 'badge--success',
  medium: 'badge--warning',
  hard: 'badge--danger',
};

const MISSING_LOCATION = 'Ubicación eliminada';

/** Origen y destino para mostrar, aunque alguno ya no exista. */
export function routeTrip(route: Route): { from: string; to: string; text: string } {
  const from = route.startLocation?.city ?? MISSING_LOCATION;
  const to = route.endLocation?.city ?? MISSING_LOCATION;
  return { from, to, text: `${from} a ${to}` };
}

export function categoryName(route: Route): string {
  return route.category?.name ?? 'Categoría eliminada';
}

/**
 * Referencias de la ruta que están en la papelera. Mientras haya alguna, la API no
 * deja restaurarla (409).
 */
export function missingReferences(route: Route): string[] {
  const missing: string[] = [];
  if (!route.category) missing.push('su categoría');
  if (!route.startLocation || !route.endLocation) missing.push('una de sus ubicaciones');
  return missing;
}
