import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DIFFICULTY_BADGES, DIFFICULTY_LABELS, Route } from '../../../../core/models/route.model';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ToggleComponent } from '../../../../shared/components/toggle/toggle.component';
import { formatNumber, formatRelativeTime } from '../../../../shared/utils/format';

/** Tarjeta de una ruta en el listado: datos clave, estado y acciones. */
@Component({
  selector: 'app-route-card',
  imports: [RouterLink, IconComponent, ToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './route-card.component.html',
  styleUrl: './route-card.component.css',
})
export class RouteCardComponent {
  readonly route = input.required<Route>();
  /** Hay una operación en curso sobre esta ruta. */
  readonly busy = input(false);
  readonly activeChange = output<boolean>();
  readonly remove = output<void>();

  protected readonly editLink = computed(() => ['/routes', this.route().slug, 'edit']);
  protected readonly difficultyLabel = computed(() => DIFFICULTY_LABELS[this.route().difficulty]);
  protected readonly badgeClass = computed(() => DIFFICULTY_BADGES[this.route().difficulty]);
  protected readonly distance = computed(() => formatNumber(this.route().distance));
  protected readonly duration = computed(() => formatNumber(this.route().duration));
  protected readonly updated = computed(() => formatRelativeTime(this.route().updatedAt));
}
