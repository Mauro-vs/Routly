import { Injectable, inject } from '@angular/core';

import { Image, ImagePayload } from '../../../core/models/image.model';
import { EntityStore } from '../../../core/services/entity.store';
import { CollectionLabels } from '../../../shared/utils/labels';
import { ImagesService } from './images.service';

/** Cómo se nombra la colección en los textos del panel. */
export const IMAGE_LABELS: CollectionLabels = {
  singular: 'imagen',
  plural: 'imágenes',
  gender: 'f',
};

/**
 * Estado de las imágenes con signals: carga, edición, cambio de estado optimista y
 * papelera vienen de EntityStore. Todavía no tiene páginas; `listPath` es la ruta
 * que tendrá su listado.
 */
@Injectable({ providedIn: 'root' })
export class ImagesStore extends EntityStore<Image, ImagePayload> {
  protected readonly api = inject(ImagesService);
  protected readonly listPath = '/images';
  protected override readonly notFoundMessage = 'Esa imagen ya no existe.';
  readonly labels = IMAGE_LABELS;

  displayName(image: Image): string {
    return image.alt || 'Imagen sin texto alternativo';
  }
}
