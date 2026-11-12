import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';

const SITE = 'Routly';
export const DEFAULT_DESCRIPTION =
  'Salidas guiadas en moto por carreteras elegidas una a una: montaña, costa, puertos y viñedos, con fecha, plazas y precio.';

/**
 * El título de la pestaña y la descripción de cada página, para el SEO. Cada ruta los da en
 * `title` y `data.description`; una página que los sabe más tarde (el detalle, con el nombre de
 * la experiencia) los pone con `set`.
 */
@Injectable({ providedIn: 'root' })
export class PageMetaStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.set(this.buildTitle(snapshot) ?? null, deepestDescription(snapshot.root));
  }

  /** "Costa en moto · Routly" y su descripción. Sin título, el nombre del sitio. */
  set(pageTitle: string | null, description: string | null = null): void {
    this.title.setTitle(pageTitle ? `${pageTitle} · ${SITE}` : `${SITE} · salidas guiadas en moto`);
    this.meta.updateTag({ name: 'description', content: description ?? DEFAULT_DESCRIPTION });
  }
}

function deepestDescription(route: ActivatedRouteSnapshot): string | null {
  let current: ActivatedRouteSnapshot | null = route;
  let description: string | null = null;
  while (current) {
    const value: unknown = current.data['description'];
    if (typeof value === 'string') description = value;
    current = current.firstChild;
  }
  return description;
}
