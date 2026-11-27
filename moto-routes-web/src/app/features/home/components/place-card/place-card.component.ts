import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Params, RouterLink } from '@angular/router';

import { SceneKind } from '../../../../shared/ui/photo/landscape';
import { PhotoComponent } from '../../../../shared/ui/photo/photo.component';

/**
 * Las placas de la señalización vertical:
 * - `town`: entrada de población, blanca con borde de tinta (los destinos);
 * - `route`: panel verde de orientación (los tipos de carretera);
 * - `guide`: placa lima (los anfitriones).
 */
export type PlateKind = 'town' | 'route' | 'guide';

/**
 * Una tarjeta del Home: la foto y debajo su placa con el nombre y cuántas experiencias tiene.
 * Toda la tarjeta es un enlace al Shop filtrado (o, la de un guía, a su ficha).
 */
@Component({
  selector: 'app-place-card',
  imports: [RouterLink, PhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './place-card.component.html',
  styleUrl: './place-card.component.css',
})
export class PlaceCardComponent {
  readonly name = input.required<string>();
  readonly count = input.required<number>();
  readonly photo = input<string | null>(null);
  readonly seed = input.required<string>();
  readonly scene = input<SceneKind | null>(null);
  readonly kind = input.required<PlateKind>();
  /** El filtro del Shop al que lleva: { categoria: 'montana-1a2b' } */
  readonly queryParams = input.required<Params>();
  /** Otra página en lugar del Shop filtrado (la ficha de un guía) */
  readonly link = input<string[] | null>(null);

  protected readonly countLabel = computed(() => `${this.count()} ${this.count() === 1 ? 'experiencia' : 'experiencias'}`);
}
