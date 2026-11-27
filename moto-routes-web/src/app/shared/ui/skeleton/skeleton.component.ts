// Copiado del panel (moto-routes-dashboard). Si cambia allí, se cambia aquí.
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
  styleUrl: './skeleton.component.css',
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
