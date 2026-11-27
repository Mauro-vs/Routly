import { Rating } from '../../core/api/shop.models';

/*
 * Las opiniones (el contrato está en la API: /api/shop/.../reviews para leer, /api/reviews para
 * escribir). Se valoran las experiencias y los guías (anfitriones); las rutas solo tienen la nota
 * de sus experiencias.
 */

export type ReviewTargetType = 'experience' | 'host';

// La nota guardada (media, cuántas y de cada estrella) es de la tienda: la llevan las experiencias y los guías
export type { Rating };

export interface ReviewPhoto {
  _id: string;
  /** /api/uploads/reviews/<archivo> */
  url: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface Review {
  _id: string;
  targetType: ReviewTargetType;
  targetId: string;
  userId: string;
  user: { _id: string; name: string; coverImage: { url: string } | null } | null;
  rating: number;
  title?: string | null;
  comment?: string | null;
  verified: boolean;
  photos: ReviewPhoto[];
  createdAt: string;
  updatedAt: string;
}

/** El resumen de todas las visibles, no solo de la página: además, cuántas tienen fotos. */
export interface ReviewsSummary extends Rating {
  withPhotos: number;
}

export interface ReviewsPage {
  data: Review[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
  summary: ReviewsSummary;
}

/** Por qué no puedes opinar: el anfitrión sobre lo suyo, o ya has opinado. */
export type CannotReviewReason = 'OWN_TARGET' | 'REVIEW_ALREADY_EXISTS' | string;

export interface MyReview {
  review: Review | null;
  canReview: boolean;
  reason: CannotReviewReason | null;
}

/** Lo que se escribe: el texto y la nota. Las fotos van aparte, de una en una. */
export interface ReviewInput {
  rating: number;
  title?: string | null;
  comment?: string | null;
}

/** Los límites de la API (REVIEW_LIMITS en moto-routes-api/src/models/review.model.js). */
export const REVIEW_LIMITS = {
  titleMax: 100,
  commentMin: 10,
  commentMax: 2000,
  /** Con estas estrellas o menos, el comentario es obligatorio... */
  lowRatingMax: 2,
  /** ...y de estos caracteres como mínimo */
  lowRatingCommentMin: 30,
  photosMax: 4,
  photoMaxBytes: 1_048_576,
} as const;

/** "0 opiniones" como un objeto, para lo que aún no tiene ninguna. */
export const EMPTY_RATING: Rating = { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
