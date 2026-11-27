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
  templateUrl: './dashboard-catalog.component.html',
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
