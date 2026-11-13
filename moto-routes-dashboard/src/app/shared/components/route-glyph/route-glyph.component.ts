import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { RouteDifficulty } from '../../../core/models/route.model';

const PATHS: Record<RouteDifficulty, string> = {
  easy: 'M22 40V6',
  medium: 'M22 40V24L34 12',
  hard: 'M22 40V28L10 20L24 10L34 6',
};

/**
 * Viñeta de hoja de ruta: el dibujo de un tramo, como las de un roadbook de rally. Cuanto más
 * difícil, más curvas. Es decorativa: la dificultad se escribe siempre al lado.
 */
@Component({
  selector: 'ui-route-glyph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 44 44" focusable="false">
      <circle cx="22" cy="40" r="3" fill="currentColor" />
      <path [attr.d]="path()" fill="none" stroke="currentColor" stroke-width="3" />
    </svg>
  `,
  styles: `
    :host {
      display: block;
      flex: none;
      width: var(--glyph-size, 34px);
      height: var(--glyph-size, 34px);
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
  host: { 'aria-hidden': 'true' },
})
export class RouteGlyphComponent {
  readonly difficulty = input<RouteDifficulty>('medium');

  protected readonly path = computed(() => PATHS[this.difficulty()]);
}
