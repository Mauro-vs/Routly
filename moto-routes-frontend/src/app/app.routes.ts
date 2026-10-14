import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';

const messagePage = () =>
  import('./shared/components/message-page/message-page.component').then(
    (m) => m.MessagePageComponent,
  );

/**
 * Cada feature se carga aparte (lazy loading). Para añadir una entidad: crea su
 * carpeta en features/, registra aquí su ruta y dale entrada en
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
        title: 'Resumen',
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
