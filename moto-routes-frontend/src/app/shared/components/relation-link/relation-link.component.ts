import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Gender, agree } from '../../utils/labels';
import { RouterPath } from '../../utils/router';
import { IconComponent } from '../icon/icon.component';

/**
 * Un registro relacionado (la categoría de una ruta, el usuario de un anfitrión...)
 * con enlace a su detalle. La API devuelve `null` cuando ese registro se ha
 * eliminado: entonces se muestra "Eliminado" en vez de romper la página.
 *
 *   <ui-relation-link [label]="ruta.category?.name ?? null" [path]="['/categories', slug]" gender="f" />
 */
@Component({
  selector: 'ui-relation-link',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (label(); as label) {
      @if (path(); as path) {
        <a class="link" [routerLink]="path">{{ label }}</a>
      } @else {
        <span>{{ label }}</span>
      }
    } @else {
      <span class="gone"><ui-icon name="trash" />{{ deletedText() }}</span>
    }
  `,
  styles: `
    :host {
      min-width: 0;
    }

    .gone {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .gone ui-icon {
      font-size: 14px;
    }
  `,
})
export class RelationLinkComponent {
  /** Nombre del registro relacionado. null: se ha eliminado. */
  readonly label = input.required<string | null>();
  /** Su detalle. Sin ruta se muestra el nombre sin enlace. */
  readonly path = input<RouterPath | null>(null);
  /** Para "Eliminada" (una categoría) o "Eliminado" (un usuario). */
  readonly gender = input<Gender>('m');

  protected deletedText(): string {
    return agree(this.gender(), 'Eliminada', 'Eliminado');
  }
}
