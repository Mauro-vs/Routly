import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ShopImage } from '../../../../core/api/shop.models';
import { CarouselComponent } from '../../../../shared/ui/carousel/carousel.component';
import { PhotoComponent } from '../../../../shared/ui/photo/photo.component';

/**
 * La galería del detalle: las fotos de la experiencia, por posición, en el carrusel (flechas,
 * arrastre y teclado). Sin fotos, una sola imagen: el paisaje de la marca.
 */
@Component({
  selector: 'app-gallery',
  imports: [CarouselComponent, PhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (images().length > 0) {
      <ui-carousel [label]="'Fotos de ' + title()">
        @for (image of images(); track image._id; let first = $first; let i = $index) {
          <figure class="slide" tabindex="0" [attr.aria-label]="'Foto ' + (i + 1) + ' de ' + images().length">
            <ui-photo [src]="image.url" [alt]="image.alt || title()" [seed]="seed() + i" [priority]="first" />
          </figure>
        }
      </ui-carousel>
    } @else {
      <figure class="slide single">
        <ui-photo [src]="null" [seed]="seed()" [alt]="'Sin fotos de ' + title() + ' todavía'" />
      </figure>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .slide {
      width: min(78vw, 860px);
      margin: 0;
      border-radius: var(--radius-lg);
    }

    .slide.single {
      width: 100%;
    }

    ui-photo {
      aspect-ratio: 16 / 9;
      border-radius: var(--radius-lg);
    }

    .slide:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    @media (max-width: 560px) {
      .slide {
        width: 86vw;
      }

      ui-photo {
        aspect-ratio: 4 / 3;
      }
    }
  `,
})
export class GalleryComponent {
  readonly images = input.required<ShopImage[]>();
  readonly title = input.required<string>();
  readonly seed = input.required<string>();
}
