import { BaseRecord } from './entity.model';
import { ImageSummary } from './image.model';

/** De qué es una opinión: una experiencia o un anfitrión (REVIEW_TARGET_TYPES en la API). */
export type ReviewTargetType = 'experience' | 'host';

/** Cómo se nombra cada tipo y dónde está su página en el panel. */
export const REVIEW_TARGETS: Readonly<Record<ReviewTargetType, { label: string; path: string }>> = {
  experience: { label: 'Experiencia', path: '/experiences' },
  host: { label: 'Anfitrión', path: '/hosts' },
};

/**
 * La nota de una experiencia, un anfitrión o una ruta: la media de sus opiniones visibles, cuántas
 * hay y cuántas de cada estrella. La calcula la API (services/rating.service.js).
 */
export interface Rating {
  average: number;
  count: number;
  distribution: Partial<Record<'1' | '2' | '3' | '4' | '5', number>>;
}

/** Una foto de una opinión, ya servida por la API (/api/uploads/reviews/...). */
export interface ReviewPhoto {
  _id: string;
  url: string;
  width: number;
  height: number;
  createdAt: string;
}

/**
 * Una opinión. No tiene slug: el detalle va por su `_id`. Se escriben en la web; el panel solo
 * modera: ocultar (inactiva) o mostrar, borrar (a la papelera) y quitar una foto.
 */
export interface Review extends BaseRecord {
  targetType: ReviewTargetType;
  targetId: string;
  /** Lo que se valora: su título o nombre y su slug. null si se ha eliminado. */
  target: { _id: string; name: string; slug: string } | null;
  userId: string;
  /** Quién la ha escrito. null si su cuenta ya no existe. */
  user: { _id: string; name: string; coverImage?: ImageSummary | null } | null;
  /** De 1 a 5 */
  rating: number;
  title?: string | null;
  comment?: string | null;
  /** Hizo la salida (llegará con las reservas) */
  verified: boolean;
  photos: ReviewPhoto[];
}

/** Las opiniones no se crean ni se editan desde el panel. */
export type ReviewPayload = never;
