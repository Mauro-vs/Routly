import { Injectable } from '@angular/core';

import { Experience } from '../../../core/models/experience.model';
import { Host } from '../../../core/models/host.model';
import { Review, ReviewPayload } from '../../../core/models/review.model';
import { RecordApiService } from '../../../core/services/entity-api.service';

/** Una opción del filtro "Sobre": una experiencia o un anfitrión. */
export interface ReviewTargetOption {
  _id: string;
  name: string;
  type: 'experience' | 'host';
}

/**
 * Llamadas a `/api/reviews`, solo de moderación (las opiniones se escriben en la web). Los
 * endpoints comunes vienen de RecordApiService (sin slug: el detalle va por `_id`).
 */
@Injectable({ providedIn: 'root' })
export class ReviewsService extends RecordApiService<Review, ReviewPayload> {
  protected readonly path = '/reviews';

  /** Quita una foto de una opinión y borra su archivo. Devuelve la opinión sin ella. */
  removePhoto(id: string, photoId: string): Promise<Review> {
    return this.api.delete<Review>(`${this.path}/${id}/photos/${photoId}`);
  }

  /**
   * Las experiencias y los anfitriones, para el filtro "Sobre". Todos, también los inactivos:
   * pueden tener opiniones. Se piden aquí y no a sus features: una feature no importa de otra.
   */
  async getTargetOptions(): Promise<ReviewTargetOption[]> {
    const [experiences, hosts] = await Promise.all([
      this.api.get<Experience[]>('/experiences'),
      this.api.get<Host[]>('/hosts'),
    ]);
    return [
      ...experiences.map((experience) => ({ _id: experience._id, name: experience.title, type: 'experience' as const })),
      ...hosts.map((host) => ({ _id: host._id, name: host.name, type: 'host' as const })),
    ];
  }
}
