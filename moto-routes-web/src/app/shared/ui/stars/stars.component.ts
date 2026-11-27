import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { formatRating } from '../../utils/shop-format';

/** La estrella de cinco puntas, en un cuadro de 24 */
export const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26';

/**
 * Cinco estrellas con la nota pintada (también las medias: 4,5 llena cuatro y media). Mide 1em
 * de alto, como los iconos: su tamaño se ajusta con font-size. Lleva su texto para los lectores de
 * pantalla ("4,5 de 5 estrellas"); las estrellas en sí son decorativas.
 */
@Component({
  selector: 'ui-stars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stars.component.html',
  styleUrl: './stars.component.css',
})
export class StarsComponent {
  /** La nota, de 0 a 5 */
  readonly value = input.required<number>();

  protected readonly five = [1, 2, 3, 4, 5];
  protected readonly points = STAR_POINTS;
  // El hueco entre estrellas también cuenta en el ancho: una nota de 4 llena justo 4 estrellas
  protected readonly percent = computed(() => {
    const value = Math.max(0, Math.min(5, this.value()));
    const whole = Math.floor(value);
    const gaps = 0.08 * Math.min(whole, 4);
    return ((value + gaps) / (5 + 0.08 * 4)) * 100;
  });
  protected readonly label = computed(() => `${formatRating(this.value())} de 5 estrellas`);
}
