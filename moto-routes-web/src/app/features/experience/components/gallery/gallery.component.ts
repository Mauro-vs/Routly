import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ShopImage } from '../../../../core/api/shop.models';
import { CarouselComponent } from '../../../../shared/ui/carousel/carousel.component';
import { PhotoComponent } from '../../../../shared/ui/photo/photo.component';
import { SceneKind } from '../../../../shared/ui/photo/landscape';

/**
 * La galería del detalle: las fotos de la experiencia, por posición, en el carrusel (flechas,
 * arrastre y teclado). Sin fotos, una sola imagen: el paisaje de la marca.
 */
@Component({
  selector: 'app-gallery',
  imports: [CarouselComponent, PhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.css',
})
export class GalleryComponent {
  readonly images = input.required<ShopImage[]>();
  readonly title = input.required<string>();
  readonly seed = input.required<string>();
  /** El paisaje del tipo de carretera, para las fotos que no cargan */
  readonly scene = input<SceneKind | null>(null);
}
