import { Routes } from '@angular/router';

import { collectionRoutes } from '../../shared/pages/collection-routes';
import { USER_LABELS } from './services/users.store';

/** Páginas de los usuarios. El formulario es el mismo para crear y para editar. */
export const USERS_ROUTES: Routes = collectionRoutes({
  labels: USER_LABELS,
  title: 'Usuarios',
  list: () => import('./pages/users-list/users-list.component').then((m) => m.UsersListComponent),
  detail: () =>
    import('./pages/user-detail/user-detail.component').then((m) => m.UserDetailComponent),
  form: () =>
    import('./pages/user-form/user-form-page.component').then((m) => m.UserFormPageComponent),
  trash: () =>
    import('./pages/users-trash/users-trash.component').then((m) => m.UsersTrashComponent),
});
