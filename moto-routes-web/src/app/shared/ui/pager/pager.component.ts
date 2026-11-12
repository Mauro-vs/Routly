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
  template: `
    @if (totalPages() > 1) {
      <nav [attr.aria-label]="label()">
        @if (page() > 1) {
          <a class="step" [routerLink]="[]" [queryParams]="paramsFor(page() - 1)" queryParamsHandling="merge" aria-label="Página anterior">
            <ui-icon name="caret-left" />
          </a>
        } @else {
          <span class="step" aria-label="Página anterior" aria-disabled="true"><ui-icon name="caret-left" /></span>
        }

        @for (item of items(); track $index) {
          @if (item === null) {
            <span class="gap" aria-hidden="true">…</span>
          } @else if (item === page()) {
            <span class="num current" aria-current="page">{{ item }}</span>
          } @else {
            <a class="num" [routerLink]="[]" [queryParams]="paramsFor(item)" queryParamsHandling="merge">{{ item }}</a>
          }
        }

        @if (page() < totalPages()) {
          <a class="step" [routerLink]="[]" [queryParams]="paramsFor(page() + 1)" queryParamsHandling="merge" aria-label="Página siguiente">
            <ui-icon name="caret-right" />
          </a>
        } @else {
          <span class="step" aria-label="Página siguiente" aria-disabled="true"><ui-icon name="caret-right" /></span>
        }
      </nav>
    }
  `,
  styles: `
    nav {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: var(--space-2);
    }

    a,
    span {
      display: grid;
      place-items: center;
      min-width: 44px;
      height: 44px;
      padding: 0 var(--space-2);
      border-radius: var(--radius-md);
      font-weight: 650;
      text-decoration: none;
    }

    a {
      border: 1px solid var(--color-border);
      transition: border-color var(--motion-fast), background var(--motion-fast);
    }

    a:hover {
      border-color: var(--color-border-strong);
      background: var(--color-surface-2);
    }

    .current {
      position: relative;
      isolation: isolate;
      color: var(--color-on-accent);
    }

    .current::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      border-radius: var(--radius-sm);
      background: var(--color-accent);
      transform: skewX(var(--slant));
    }

    [aria-disabled='true'] {
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      opacity: 0.45;
    }

    .gap {
      min-width: 24px;
      color: var(--color-text-muted);
    }

    .step {
      font-size: 18px;
    }
  `,
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
