import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

const routeForm = () =>
  import('./pages/route-form/route-form.component').then((m) => m.RouteFormPageComponent);

/**
 * Páginas de la entidad. El formulario es el mismo para crear y para editar; al
 * editar, la ruta se identifica por su `slug`, que llega al componente como input().
 */
export const ROUTES_ROUTES: Routes = [
  {
    path: '',
    title: 'Rutas',
    loadComponent: () =>
      import('./pages/routes-list/routes-list.component').then((m) => m.RoutesListComponent),
  },
  {
    path: 'trash',
    title: 'Papelera',
    loadComponent: () =>
      import('./pages/routes-trash/routes-trash.component').then((m) => m.RoutesTrashComponent),
  },
  {
    path: 'new',
    title: 'Nueva ruta',
    data: { crumb: 'Nueva ruta' },
    canDeactivate: [unsavedChangesGuard],
    loadComponent: routeForm,
  },
  {
    path: ':slug/edit',
    title: 'Editar ruta',
    data: { crumb: 'Editar ruta' },
    canDeactivate: [unsavedChangesGuard],
    loadComponent: routeForm,
  },
];
