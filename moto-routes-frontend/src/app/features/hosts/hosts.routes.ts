import { Routes } from '@angular/router';

import { collectionRoutes } from '../../shared/pages/collection-routes';
import { HOST_LABELS } from './services/hosts.store';

/** Páginas de los anfitriones. El formulario es el mismo para crear y para editar. */
export const HOSTS_ROUTES: Routes = collectionRoutes({
  labels: HOST_LABELS,
  title: 'Anfitriones',
  list: () => import('./pages/hosts-list/hosts-list.component').then((m) => m.HostsListComponent),
  detail: () =>
    import('./pages/host-detail/host-detail.component').then((m) => m.HostDetailComponent),
  form: () =>
    import('./pages/host-form/host-form-page.component').then((m) => m.HostFormPageComponent),
  trash: () =>
    import('./pages/hosts-trash/hosts-trash.component').then((m) => m.HostsTrashComponent),
});
