import { Type } from '@angular/core';
import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';
import { CollectionLabels, agree, capitalize } from '../utils/labels';

type LoadComponent = () => Promise<Type<unknown>>;

interface CollectionPages {
  labels: CollectionLabels;
  /** Título del listado: "Categorías". */
  title: string;
  list: LoadComponent;
  detail: LoadComponent;
  trash: LoadComponent;
  /** Crear y editar. Sin él, la colección no se crea ni se edita desde el panel. */
  form?: LoadComponent;
  /** Sin `new`: se edita, pero se crea desde otra página (las imágenes, desde su dueño). */
  noCreate?: boolean;
  /** Parámetro del detalle: el `slug`, o el `id` en las colecciones sin slug. */
  param?: 'slug' | 'id';
}

/**
 * Las páginas de una colección: listado, papelera, crear, detalle y editar. Cada página
 * se descarga aparte, y los formularios avisan antes de salir con cambios sin guardar.
 * El parámetro (`slug` o `id`) llega a la página como input().
 *
 *   /categories             listado
 *   /categories/trash       papelera
 *   /categories/new         crear
 *   /categories/id/:id      lleva al detalle de un registro del que solo se sabe el id
 *   /categories/:slug       detalle
 *   /categories/:slug/edit  editar
 */
export function collectionRoutes(pages: CollectionPages): Routes {
  const { labels, title, form } = pages;
  const param = pages.param ?? 'slug';
  const single = capitalize(labels.singular);
  const newTitle = `${agree(labels.gender, 'Nueva', 'Nuevo')} ${labels.singular}`;
  const editTitle = `Editar ${labels.singular}`;

  const routes: Routes = [
    { path: '', title, loadComponent: pages.list },
    { path: 'trash', title: 'Papelera', data: { crumb: 'Papelera' }, loadComponent: pages.trash },
  ];

  if (form && !pages.noCreate) {
    routes.push({
      path: 'new',
      title: newTitle,
      data: { crumb: newTitle },
      canDeactivate: [unsavedChangesGuard],
      loadComponent: form,
    });
  }

  // Para las relaciones que llegan sin slug: /<colección>/id/:id lleva a su detalle.
  if (param === 'slug') {
    routes.push({
      path: 'id/:id',
      title: single,
      loadComponent: () =>
        import('./record-redirect.component').then((m) => m.RecordRedirectComponent),
    });
  }

  routes.push({ path: `:${param}`, title: single, data: { crumb: single }, loadComponent: pages.detail });

  if (form) {
    routes.push({
      path: `:${param}/edit`,
      title: editTitle,
      data: { crumb: editTitle },
      canDeactivate: [unsavedChangesGuard],
      loadComponent: form,
    });
  }

  return routes;
}
