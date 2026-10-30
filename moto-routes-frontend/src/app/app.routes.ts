import { Routes } from '@angular/router';

import { authGuard } from './auth/auth.guard';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';

const messagePage = () =>
  import('./shared/components/message-page/message-page.component').then(
    (m) => m.MessagePageComponent,
  );

/**
 * Cada feature se carga aparte (lazy loading). Para añadir una entidad: crea su
 * carpeta en features/, registra aquí su ruta y quita su `pending` en
 * layouts/admin-layout/navigation.ts.
 */
export const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'routes',
        loadChildren: () => import('./features/routes/routes.routes').then((m) => m.ROUTES_ROUTES),
      },
      {
        path: 'categories',
        loadChildren: () =>
          import('./features/categories/categories.routes').then((m) => m.CATEGORIES_ROUTES),
      },
      {
        path: 'locations',
        loadChildren: () =>
          import('./features/locations/locations.routes').then((m) => m.LOCATIONS_ROUTES),
      },
      {
        path: 'experiences',
        loadChildren: () =>
          import('./features/experiences/experiences.routes').then((m) => m.EXPERIENCES_ROUTES),
      },
      {
        path: 'departures',
        loadChildren: () =>
          import('./features/departures/departures.routes').then((m) => m.DEPARTURES_ROUTES),
      },
      {
        path: 'users',
        loadChildren: () => import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
      },
      {
        path: 'hosts',
        loadChildren: () => import('./features/hosts/hosts.routes').then((m) => m.HOSTS_ROUTES),
      },
      {
        path: 'roles',
        loadChildren: () => import('./features/roles/roles.routes').then((m) => m.ROLES_ROUTES),
      },
      {
        path: 'images',
        loadChildren: () => import('./features/images/images.routes').then((m) => m.IMAGES_ROUTES),
      },
      {
        path: '**',
        title: 'Página no encontrada',
        loadComponent: messagePage,
        data: {
          heading: 'Esta página no existe',
          description: 'Puede que la dirección esté mal escrita o que la página se haya movido.',
          icon: 'compass',
          actionPath: '/',
        },
      },
    ],
  },
];
