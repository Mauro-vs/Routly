import { BaseEntity } from './entity.model';

export type RouteDifficulty = 'easy' | 'medium' | 'hard';

/** Ruta en moto, tal como la devuelve `GET /api/routes`. */
export interface Route extends BaseEntity {
  title: string;
  description?: string;
  difficulty: RouteDifficulty;
  /** Kilómetros. */
  distance: number;
  /** Horas. */
  duration: number;
  startPoint: string;
  endPoint: string;
}

/** Cuerpo de `POST /api/routes` y, con campos opcionales, de `PATCH /api/routes/:id`. */
export interface RoutePayload {
  title: string;
  description?: string;
  difficulty: RouteDifficulty;
  distance: number;
  duration: number;
  startPoint: string;
  endPoint: string;
}

/** Los mismos límites que valida la API (src/schemas/route.schema.js). */
export const ROUTE_LIMITS = {
  title: 120,
  description: 500,
  point: 100,
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
