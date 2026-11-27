import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Params, RouterLink } from '@angular/router';

import { IconComponent } from '../icon/icon.component';

/**
 * Las páginas que se enseñan: todas si son pocas; si no, la primera, la última, la actual con
 * sus vecinas, y `null` donde hay un salto ("1 … 9 10 11 … 20").
 */
export function pageItems(page: number, totalPages: number): Array<number | null> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const shown = new Set([1, totalPages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= totalPages));
  const sorted = [...shown].sort((a, b) => a - b);
  const items: Array<number | null> = [];
  for (const n of sorted) {
    const previous = items.at(-1);
    if (typeof previous === 'number' && n - previous > 1) items.push(null);
    items.push(n);
  }
  return items;
}

/**
 * Paginación por enlaces: cada página es una URL (`?pagina=3`), así el botón de atrás, recargar y
 * compartir enseñan lo mismo. Mantiene el resto de parámetros (los filtros). La primera página no
 * lleva parámetro. No sabe qué se pagina: quien la usa le da la página y el total.
 */
@Component({
  selector: 'ui-pager',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pager.component.html',
  styleUrl: './pager.component.css',
})
export class PagerComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  /** El nombre del parámetro de la URL */
  readonly param = input('pagina');
  readonly label = input('Páginas');

  protected readonly items = computed(() => pageItems(this.page(), this.totalPages()));

  // La primera página sin parámetro: null lo quita de la URL al mezclar
  protected paramsFor(page: number): Params {
    return { [this.param()]: page === 1 ? null : page };
  }
}
