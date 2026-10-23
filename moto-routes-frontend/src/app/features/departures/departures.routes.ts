import { Routes } from '@angular/router';

import { collectionRoutes } from '../../shared/pages/collection-routes';
import { DEPARTURE_LABELS } from './services/departures.store';

/** Páginas de las salidas. El formulario es el mismo para crear y para editar. */
export const DEPARTURES_ROUTES: Routes = collectionRoutes({
  labels: DEPARTURE_LABELS,
  title: 'Salidas',
  list: () =>
    import('./pages/departures-list/departures-list.component').then(
      (m) => m.DeparturesListComponent,
    ),
  detail: () =>
    import('./pages/departure-detail/departure-detail.component').then(
      (m) => m.DepartureDetailComponent,
    ),
  form: () =>
    import('./pages/departure-form/departure-form-page.component').then(
      (m) => m.DepartureFormPageComponent,
    ),
  trash: () =>
    import('./pages/departures-trash/departures-trash.component').then(
      (m) => m.DeparturesTrashComponent,
    ),
});
