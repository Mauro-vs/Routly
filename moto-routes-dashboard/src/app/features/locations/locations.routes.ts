import { Routes } from '@angular/router';

import { collectionRoutes } from '../../shared/pages/collection-routes';
import { LOCATION_LABELS } from './services/locations.store';

/** Páginas de las ubicaciones. El formulario es el mismo para crear y para editar. */
export const LOCATIONS_ROUTES: Routes = collectionRoutes({
  labels: LOCATION_LABELS,
  title: 'Ubicaciones',
  list: () =>
    import('./pages/locations-list/locations-list.component').then((m) => m.LocationsListComponent),
  detail: () =>
    import('./pages/location-detail/location-detail.component').then((m) => m.LocationDetailComponent),
  form: () =>
    import('./pages/location-form/location-form-page.component').then(
      (m) => m.LocationFormPageComponent,
    ),
  trash: () =>
    import('./pages/locations-trash/locations-trash.component').then(
      (m) => m.LocationsTrashComponent,
    ),
});
