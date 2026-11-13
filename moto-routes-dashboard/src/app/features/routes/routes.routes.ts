import { Routes } from '@angular/router';

import { collectionRoutes } from '../../shared/pages/collection-routes';
import { ROUTE_LABELS } from './services/routes.store';

/** Páginas de las rutas. El formulario es el mismo para crear y para editar. */
export const ROUTES_ROUTES: Routes = collectionRoutes({
  labels: ROUTE_LABELS,
  title: 'Rutas',
  list: () => import('./pages/routes-list/routes-list.component').then((m) => m.RoutesListComponent),
  detail: () =>
    import('./pages/route-detail/route-detail.component').then((m) => m.RouteDetailComponent),
  form: () =>
    import('./pages/route-form/route-form-page.component').then((m) => m.RouteFormPageComponent),
  trash: () =>
    import('./pages/routes-trash/routes-trash.component').then((m) => m.RoutesTrashComponent),
});
