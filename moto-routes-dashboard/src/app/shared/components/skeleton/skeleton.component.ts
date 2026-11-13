import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Bloque de espera con la forma del contenido que va a llegar.
 * El tamaño se da con `width` y `height` (cualquier unidad CSS) o desde la hoja de
 * estilos de quien lo usa. Es decorativo: el contenedor debe llevar `aria-busy`.
 */
@Component({
  selector: 'ui-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  styles: `
    :host {
      position: relative;
      display: block;
      height: 1em;
      overflow: hidden;
      border-radius: var(--radius-sm);
      background: var(--color-surface-2);
    }

    :host::after {
      content: '';
      position: absolute;
      inset: 0;
      transform: translateX(-100%);
      background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-surface) 70%, transparent), transparent);
      animation: shimmer 1.6s ease-in-out infinite;
    }

    @keyframes shimmer {
      to {
        transform: translateX(100%);
      }
    }
  `,
  host: {
    'aria-hidden': 'true',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[style.border-radius]': 'radius()',
  },
})
export class SkeletonComponent {
  readonly width = input<string | null>(null);
  readonly height = input<string | null>(null);
  readonly radius = input<string | null>(null);
}
