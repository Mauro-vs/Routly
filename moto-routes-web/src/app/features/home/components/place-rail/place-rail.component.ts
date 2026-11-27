import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Params, RouterLink } from '@angular/router';

import { CarouselComponent } from '../../../../shared/ui/carousel/carousel.component';
import { SceneKind } from '../../../../shared/ui/photo/landscape';
import { PlaceCardComponent, PlateKind } from '../place-card/place-card.component';

/** Lo que pinta una tarjeta: el carril no sabe si es una categoría, un destino o un anfitrión. */
export interface PlaceItem {
  id: string;
  name: string;
  count: number;
  photo: string | null;
  seed: string;
  /** El paisaje si no hay foto; sin él, uno según la semilla */
  scene?: SceneKind | null;
  queryParams: Params;
  /** A dónde lleva la tarjeta; sin él, al Shop filtrado (queryParams) */
  link?: string[];
}

/**
 * Un carril del Home (la lista): su título, el enlace a ver todas y un carrusel con una tarjeta
 * por elemento. Sin elementos no se pinta: quien lo usa no lo pone.
 */
@Component({
  selector: 'app-place-rail',
  imports: [RouterLink, CarouselComponent, PlaceCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './place-rail.component.html',
  styleUrl: './place-rail.component.css',
  host: { '[attr.aria-labelledby]': 'headingId()' },
})
export class PlaceRailComponent {
  readonly title = input.required<string>();
  readonly allLabel = input('Ver todas');
  readonly kind = input.required<PlateKind>();
  readonly items = input.required<PlaceItem[]>();
  /** El id del título (y de la sección, en el Home) */
  readonly headingId = input.required<string>();
}
