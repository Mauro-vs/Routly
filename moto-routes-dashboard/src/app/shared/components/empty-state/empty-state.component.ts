import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icons.generated';

/**
 * Mensaje para cuando no hay nada que mostrar: listado vacío, búsqueda sin
 * resultados o una carga que ha fallado. Las acciones se proyectan dentro.
 *
 *   <ui-empty-state icon="path" title="Todavía no hay rutas" description="...">
 *     <a class="btn btn--primary" routerLink="/routes/new">Nueva ruta</a>
 *   </ui-empty-state>
 */
@Component({
  selector: 'ui-empty-state',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css',
})
export class EmptyStateComponent {
  readonly icon = input.required<IconName>();
  readonly title = input.required<string>();
  readonly description = input('');
  readonly tone = input<'neutral' | 'danger'>('neutral');
}
