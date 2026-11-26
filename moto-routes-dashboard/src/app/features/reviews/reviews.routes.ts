import { Routes } from '@angular/router';

import { collectionRoutes } from '../../shared/pages/collection-routes';
import { REVIEW_LABELS } from './services/reviews.store';

/**
 * Páginas de las opiniones: listado, papelera y detalle (por `id`, no tienen slug). No hay
 * formulario: se escriben en la web y el panel solo modera.
 */
export const REVIEWS_ROUTES: Routes = collectionRoutes({
  labels: REVIEW_LABELS,
  title: 'Opiniones',
  param: 'id',
  noCreate: true,
  list: () => import('./pages/reviews-list/reviews-list.component').then((m) => m.ReviewsListComponent),
  detail: () => import('./pages/review-detail/review-detail.component').then((m) => m.ReviewDetailComponent),
  trash: () => import('./pages/reviews-trash/reviews-trash.component').then((m) => m.ReviewsTrashComponent),
});
