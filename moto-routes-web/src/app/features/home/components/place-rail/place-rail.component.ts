import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Params, RouterLink } from '@angular/router';

import { CarouselComponent } from '../../../../shared/ui/carousel/carousel.component';
import { PlaceCardComponent, PlateKind } from '../place-card/place-card.component';

/** Lo que pinta una tarjeta: el carril no sabe si es una categoría, un destino o un anfitrión. */
export interface PlaceItem {
  id: string;
  name: string;
  count: number;
  photo: string | null;
  seed: string;
  queryParams: Params;
}

/**
 * Un carril del Home (la lista): su título, el enlace a ver todas y un carrusel con una tarjeta
 * por elemento. Sin elementos no se pinta: quien lo usa no lo pone.
 */
@Component({
  selector: 'app-place-rail',
  imports: [RouterLink, CarouselComponent, PlaceCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <h2 [id]="headingId()">{{ title() }}</h2>
      <a routerLink="/experiencias">{{ allLabel() }}</a>
    </div>
    <ui-carousel [label]="title()">
      @for (item of items(); track item.id) {
        <app-place-card
          [name]="item.name"
          [count]="item.count"
          [photo]="item.photo"
          [seed]="item.seed"
          [kind]="kind()"
          [queryParams]="item.queryParams"
        />
      }
    </ui-carousel>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--space-2);
    }

    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--space-2) var(--space-5);
    }

    h2 {
      font-size: clamp(24px, 2.8vw, 34px);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }

    .head a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      color: var(--color-primary);
      font-weight: 650;
      text-underline-offset: 4px;
    }

    /* Las flechas del carrusel suben a la altura del título, a la derecha. Solo las flechas: si
       no hay nada que desplazar no salen, y el carrusel no se mueve */
    .head {
      padding-right: 108px;
    }

    ui-carousel {
      position: relative;
    }

    ui-carousel ::ng-deep .controls {
      position: absolute;
      right: 0;
      bottom: calc(100% + var(--space-2));
    }
  `,
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
