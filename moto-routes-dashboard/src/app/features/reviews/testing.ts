import { Review } from '../../core/models/review.model';

/** Una opinión de ejemplo, con lo que devuelve GET /api/reviews. */
export function review(overrides: Partial<Review> = {}): Review {
  return {
    _id: '6abd589e3d6101dd2eb76701',
    targetType: 'experience',
    targetId: '6abd589e3d6101dd2eb76800',
    target: { _id: '6abd589e3d6101dd2eb76800', name: 'Calas de Mallorca', slug: 'calas-de-mallorca' },
    userId: '6abd589e3d6101dd2eb76900',
    user: { _id: '6abd589e3d6101dd2eb76900', name: 'Laura Campos', coverImage: null },
    rating: 4,
    title: 'Bonita ruta',
    comment: 'Disfruté mucho del paisaje, aunque el ritmo fue algo rápido.',
    verified: false,
    photos: [
      { _id: 'p1', url: '/api/uploads/reviews/a.webp', width: 1600, height: 1067, createdAt: '2026-11-20T10:00:00.000Z' },
      { _id: 'p2', url: '/api/uploads/reviews/b.webp', width: 1600, height: 1067, createdAt: '2026-11-20T10:00:00.000Z' },
    ],
    status: 'active',
    isActive: true,
    deletedAt: null,
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
    ...overrides,
  };
}
