import { CategorySummary } from './category.model';
import { BaseEntity } from './entity.model';
import { ImageSummary } from './image.model';
import { LocationSummary } from './location.model';

export type RouteDifficulty = 'easy' | 'medium' | 'hard';

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
}

/** Los mismos límites que valida la API (src/schemas/route.schema.js). */
/** Los mismos límites que la API (ROUTE_LIMITS en route.model.js). Distancia en km y duración en horas. */
export const ROUTE_LIMITS = {
  titleMin: 2,
  title: 120,
  description: 500,
  distance: 5000,
  duration: 240,
} as const;

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
