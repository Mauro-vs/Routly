import { Routes } from '@angular/router';

import { adminGuard } from './auth/admin.guard';
import { authGuard } from './auth/auth.guard';
import { guestGuard } from './auth/guest.guard';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';

const messagePage = () =>
  import('./shared/components/message-page/message-page.component').then(
    (m) => m.MessagePageComponent,
  );

const accountLayout = () =>
  import('./layouts/account-layout/account-layout.component').then(
    (m) => m.AccountLayoutComponent,
  );

/**
 * Quién entra dónde:
 *
 *   /login, /register    solo sin sesión
 *   /profile, /forbidden con sesión, en la zona de cada usuario
 *   el resto             solo ADMIN, con el panel. Un rider o un host van a su zona
 *
 * Cada feature se carga aparte (lazy loading). Para añadir una entidad: crea su
 * carpeta en features/, registra aquí su ruta y quita su `pending` en
 * layouts/admin-layout/navigation.ts.
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Crear cuenta',
    canActivate: [guestGuard],
    loadComponent: messagePage,
    data: {
      heading: 'Crear cuenta',
      description: 'El registro todavía no está disponible.',
      icon: 'user-circle',
      actionPath: '/login',
      actionLabel: 'Ir a iniciar sesión',
    },
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: accountLayout,
    children: [
      {
        path: '',
        title: 'Mi perfil',
        loadComponent: messagePage,
        data: {
          heading: 'Mi perfil',
          description: 'Aquí podrás ver y editar tus datos.',
          icon: 'user-circle',
        },
      },
      {
        path: 'garage',
        title: 'Mi garaje',
        loadComponent: messagePage,
        data: {
          heading: 'Mi garaje',
          description: 'Aquí podrás añadir tus motos.',
          icon: 'compass',
        },
      },
    ],
  },
  {
    path: 'forbidden',
    canActivate: [authGuard],
    loadComponent: accountLayout,
    children: [
      {
        path: '',
        title: 'Acceso denegado',
        loadComponent: messagePage,
        data: {
          heading: 'Acceso denegado',
          description: 'Tu cuenta no tiene permiso para ver esta página.',
          icon: 'prohibit',
          actionPath: '/',
          actionLabel: 'Volver al inicio',
        },
      },
    ],
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard, adminGuard],
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
