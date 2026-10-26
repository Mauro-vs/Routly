import { Injectable, inject } from '@angular/core';

import { IMAGE_OWNERS, Image, ImagePayload } from '../../../core/models/image.model';
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
 * Estado de las imágenes con signals: carga, edición, filtro por estado, borrado y
 * papelera vienen de EntityStore. Las imágenes no tienen slug: su detalle se abre por
 * su `_id` (`getOne`). Se crean desde la galería de su dueño, no desde aquí.
 */
@Injectable({ providedIn: 'root' })
export class ImagesStore extends EntityStore<Image, ImagePayload> {
  protected readonly api = inject(ImagesService);
  protected readonly listPath = '/images';
  protected override readonly notFoundMessage = 'Esa imagen ya no existe.';
  readonly labels = IMAGE_LABELS;

  /** Su texto alternativo o, si no tiene, de quién es: "Imagen 2 de una ruta". */
  displayName(image: Image): string {
    if (image.alt) return image.alt;
    const owner = IMAGE_OWNERS[image.ownerType];
    const article = owner.gender === 'f' ? 'una' : 'un';
    return `Imagen ${image.position + 1} de ${article} ${owner.label.toLowerCase()}`;
  }
}
