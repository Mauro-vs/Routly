import { Review, ReviewsPage } from '../../../core/reviews/reviews.models';

/** Opiniones de ejemplo para los specs, con la forma de /api/shop/.../reviews. */

export function review(id: string, overrides: Partial<Review> = {}): Review {
  return {
    _id: id,
    targetType: 'experience',
    targetId: 'e1',
    userId: `u-${id}`,
    user: { _id: `u-${id}`, name: `Rider ${id}`, coverImage: null },
    rating: 5,
    title: 'Inolvidable',
    comment: 'El paisaje es espectacular y el guía conoce cada curva.',
    verified: false,
    photos: [],
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
    ...overrides,
  };
}

export function page(reviews: Review[], { page = 1, totalPages = 1, total = reviews.length, withPhotos = 0 } = {}): ReviewsPage {
  return {
    data: reviews,
    pagination: { total, page, limit: 10, totalPages },
    summary: { average: 4.5, count: total, distribution: { 1: 0, 2: 0, 3: 1, 4: 0, 5: total - 1 }, withPhotos },
  };
}
