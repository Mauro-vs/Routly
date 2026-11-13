import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BarItem, BarListComponent } from '../../../../shared/components/bar-list/bar-list.component';
import { StatItem, StatStripComponent } from '../../../../shared/components/stat-strip/stat-strip.component';

/** Un mes de la tira de salidas: cuántas hay, con su nombre corto y el completo. */
export interface MonthTotal {
  label: string;
  fullLabel: string;
  total: number;
}

/** Las categorías que se quedan sin barra, resumidas en una línea. */
export interface OtherCategories {
  count: number;
  routes: number;
}

/** La columna del catálogo: las cifras, la dificultad, las categorías y las salidas por mes. */
@Component({
  selector: 'app-dashboard-catalog',
  imports: [RouterLink, BarListComponent, StatStripComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="catalog">
      <header class="sheet-head">
        <h2 id="catalog">Catálogo</h2>
      </header>
      <ui-stat-strip [items]="stats()" />
    </section>

    <section aria-labelledby="by-difficulty">
      <header class="sheet-head">
        <h2 id="by-difficulty">Dificultad</h2>
      </header>
      <ui-bar-list label="Rutas por dificultad" unit="rutas" [items]="byDifficulty()" />
    </section>

    <section aria-labelledby="by-category">
      <header class="sheet-head">
        <h2 id="by-category">Categorías</h2>
      </header>
      <ui-bar-list label="Rutas por categoría" unit="rutas" [items]="byCategory()" />
      @if (otherCategories(); as other) {
        <p class="quiet">
          Y {{ other.count }} categorías más, con {{ other.routes }}
          {{ other.routes === 1 ? 'ruta' : 'rutas' }} en total.
          <a routerLink="/categories">Ver todas</a>
        </p>
      }
    </section>

    <section aria-labelledby="by-month">
      <header class="sheet-head">
        <h2 id="by-month">Salidas por mes</h2>
      </header>
      <ol class="months">
        @for (month of months(); track month.label) {
          <li [class.has-departures]="month.total > 0" [attr.aria-label]="month.fullLabel + ': ' + month.total">
            <b aria-hidden="true">{{ month.total }}</b>
            <span aria-hidden="true">{{ month.label }}</span>
          </li>
        }
      </ol>
    </section>
  `,
  styleUrls: ['../dashboard-sheet.css', './dashboard-catalog.component.css'],
})
export class DashboardCatalogComponent {
  readonly stats = input.required<readonly StatItem[]>();
  readonly byDifficulty = input.required<readonly BarItem[]>();
  readonly byCategory = input.required<readonly BarItem[]>();
  /** null si todas las categorías tienen su barra. */
  readonly otherCategories = input.required<OtherCategories | null>();
  readonly months = input.required<readonly MonthTotal[]>();
}
