import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guards';

/*
 * Las pantallas de la web pública, cada una en su trozo (carga diferida). Las URL y sus
 * parámetros van en español: /experiencias?categoria=&anfitrion=&ubicacion=&buscar=&pagina=&orden=
 *
 * La cuenta del cliente: /entrar y /registro solo sin sesión (guestGuard), /mi-cuenta solo con
 * ella (authGuard). Las dos primeras aceptan ?volver= para volver a donde iba.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Salidas guiadas en moto',
    loadComponent: () => import('./features/home/home-page.component').then((m) => m.HomePageComponent),
  },
  {
    path: 'experiencias',
    title: 'Experiencias',
    data: {
      description:
        'Todas las salidas guiadas en moto de Routly: filtra por tipo de carretera, destino y anfitrión, y elige fecha.',
    },
    loadComponent: () => import('./features/shop/shop-page.component').then((m) => m.ShopPageComponent),
  },
  {
    path: 'experiencias/:slug',
    // El título y la descripción los pone el detalle cuando conoce la experiencia
    loadComponent: () =>
      import('./features/experience/experience-page.component').then((m) => m.ExperiencePageComponent),
  },
  {
    path: 'guias/:slug',
    // Como el detalle: el título lo pone la ficha cuando conoce al guía
    loadComponent: () => import('./features/guide/guide-page.component').then((m) => m.GuidePageComponent),
  },
  {
    path: 'entrar',
    title: 'Entrar',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/account/login-page/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'registro',
    title: 'Crear cuenta',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/account/register-page/register-page.component').then((m) => m.RegisterPageComponent),
  },
  {
    path: 'mi-cuenta',
    title: 'Mi cuenta',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/account-page/account-page.component').then((m) => m.AccountPageComponent),
  },
  {
    path: '**',
    title: 'Página no encontrada',
    loadComponent: () => import('./features/not-found/not-found-page.component').then((m) => m.NotFoundPageComponent),
  },
];
