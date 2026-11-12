import { Routes } from '@angular/router';

/*
 * Las tres pantallas de la web pública, cada una en su trozo (carga diferida). Las URL y sus
 * parámetros van en español: /experiencias?categoria=&anfitrion=&ubicacion=&buscar=&pagina=&orden=
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
    path: '**',
    title: 'Página no encontrada',
    loadComponent: () => import('./features/not-found/not-found-page.component').then((m) => m.NotFoundPageComponent),
  },
];
