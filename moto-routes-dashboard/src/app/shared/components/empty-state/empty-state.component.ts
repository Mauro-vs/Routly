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
  template: `
    <span class="empty__icon" [class.empty__icon--danger]="tone() === 'danger'">
      <ui-icon [name]="icon()" />
    </span>
    <h2 class="empty__title">{{ title() }}</h2>
    @if (description()) {
      <p class="empty__text">{{ description() }}</p>
    }
    <div class="empty__actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: 6px;
      padding: var(--space-7) var(--space-5);
      text-align: center;
    }

    .empty__icon {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      margin-bottom: var(--space-3);
      border-radius: var(--radius-lg);
      font-size: 24px;
      color: var(--color-primary);
      background: var(--color-primary-soft);
    }

    .empty__icon--danger {
      color: var(--color-danger);
      background: var(--color-danger-bg);
    }

    .empty__title {
      font-size: var(--text-lg);
      font-weight: 700;
      letter-spacing: -0.02em;
      text-wrap: balance;
    }

    .empty__text {
      max-width: 46ch;
      color: var(--color-text-muted);
      text-wrap: pretty;
    }

    .empty__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-2);
      margin-top: var(--space-4);
    }

    .empty__actions:empty {
      display: none;
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input.required<IconName>();
  readonly title = input.required<string>();
  readonly description = input('');
  readonly tone = input<'neutral' | 'danger'>('neutral');
}
