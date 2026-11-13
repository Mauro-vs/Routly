import { Routes } from '@angular/router';

import { collectionRoutes } from '../../shared/pages/collection-routes';
import { BIKE_LABELS } from './services/bikes.store';

/** Páginas de las motos en el panel. Mi garaje tiene las suyas, en la zona de cada usuario. */
export const BIKES_ROUTES: Routes = collectionRoutes({
  labels: BIKE_LABELS,
  title: 'Motos',
  list: () => import('./pages/bikes-list/bikes-list.component').then((m) => m.BikesListComponent),
  detail: () =>
    import('./pages/bike-detail/bike-detail.component').then((m) => m.BikeDetailComponent),
  form: () =>
    import('./pages/bike-form/bike-form-page.component').then((m) => m.BikeFormPageComponent),
  trash: () =>
    import('./pages/bikes-trash/bikes-trash.component').then((m) => m.BikesTrashComponent),
});
