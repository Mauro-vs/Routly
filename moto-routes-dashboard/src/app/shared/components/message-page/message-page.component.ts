import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { IconName } from '../icon/icons.generated';

/**
 * Página de un solo mensaje, por ejemplo una dirección que no existe.
 * Los textos llegan desde `data` en la definición de la ruta.
 *
 *   { path: '**', component: MessagePageComponent,
 *     data: { heading: 'Esta página no existe', description: '...', actionPath: '/' } }
 *
 * El router pone a `undefined` los inputs que no vienen en `data`, por eso los
 * valores por defecto se resuelven en la plantilla y no en el input.
 */
@Component({
  selector: 'ui-message-page',
  imports: [RouterLink, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './message-page.component.html',
  styleUrl: './message-page.component.css',
})
export class MessagePageComponent {
  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly icon = input<IconName>();
  readonly actionLabel = input<string>();
  readonly actionPath = input<string>();
}
