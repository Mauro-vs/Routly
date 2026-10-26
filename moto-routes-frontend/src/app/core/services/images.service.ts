import { Injectable } from '@angular/core';

import { Image, ImageOwnerType, ImagePayload } from '../models/image.model';
import { RecordApiService } from './entity-api.service';

/**
 * Llamadas a `/api/images`. Los endpoints comunes vienen de RecordApiService
 * (las imágenes no tienen slug: no hay getBySlug).
 */
@Injectable({ providedIn: 'root' })
export class ImagesService extends RecordApiService<Image, ImagePayload> {
  protected readonly path = '/images';

  /** La galería de un dueño (una ruta, un usuario...), ordenada por posición. */
  getByOwner(ownerType: ImageOwnerType, ownerId: string): Promise<Image[]> {
    return this.api.get<Image[]>(this.path, { params: { ownerType, ownerId } });
  }
}
