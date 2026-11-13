import { Routes } from '@angular/router';

import { collectionRoutes } from '../../shared/pages/collection-routes';
import { CATEGORY_LABELS } from './services/categories.store';

/** Páginas de las categorías. El formulario es el mismo para crear y para editar. */
export const CATEGORIES_ROUTES: Routes = collectionRoutes({
  labels: CATEGORY_LABELS,
  title: 'Categorías',
  list: () =>
    import('./pages/categories-list/categories-list.component').then((m) => m.CategoriesListComponent),
  detail: () =>
    import('./pages/category-detail/category-detail.component').then((m) => m.CategoryDetailComponent),
  form: () =>
    import('./pages/category-form/category-form-page.component').then(
      (m) => m.CategoryFormPageComponent,
    ),
  trash: () =>
    import('./pages/categories-trash/categories-trash.component').then(
      (m) => m.CategoriesTrashComponent,
    ),
});
