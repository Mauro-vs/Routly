import { Routes } from '@angular/router';

import { collectionRoutes } from '../../shared/pages/collection-routes';
import { IMAGE_LABELS } from './services/images.store';

/**
 * Páginas de las imágenes. No tienen slug (el detalle va por `id`) ni página de crear:
 * se añaden desde la galería de su dueño.
 */
export const IMAGES_ROUTES: Routes = collectionRoutes({
  labels: IMAGE_LABELS,
  title: 'Imágenes',
  param: 'id',
  noCreate: true,
  list: () => import('./pages/images-list/images-list.component').then((m) => m.ImagesListComponent),
  detail: () =>
    import('./pages/image-detail/image-detail.component').then((m) => m.ImageDetailComponent),
  form: () =>
    import('./pages/image-form/image-form-page.component').then((m) => m.ImageFormPageComponent),
  trash: () =>
    import('./pages/images-trash/images-trash.component').then((m) => m.ImagesTrashComponent),
});
