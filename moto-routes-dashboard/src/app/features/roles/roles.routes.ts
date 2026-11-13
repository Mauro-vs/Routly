import { Routes } from '@angular/router';

import { collectionRoutes } from '../../shared/pages/collection-routes';
import { ROLE_LABELS } from './services/roles.store';

/** Páginas de los roles. El formulario es el mismo para crear y para editar. */
export const ROLES_ROUTES: Routes = collectionRoutes({
  labels: ROLE_LABELS,
  title: 'Roles',
  list: () => import('./pages/roles-list/roles-list.component').then((m) => m.RolesListComponent),
  detail: () =>
    import('./pages/role-detail/role-detail.component').then((m) => m.RoleDetailComponent),
  form: () =>
    import('./pages/role-form/role-form-page.component').then((m) => m.RoleFormPageComponent),
  trash: () =>
    import('./pages/roles-trash/roles-trash.component').then((m) => m.RolesTrashComponent),
});
