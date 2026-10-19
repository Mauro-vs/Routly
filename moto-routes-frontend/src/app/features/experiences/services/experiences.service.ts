import { Injectable } from '@angular/core';

import { Experience, ExperiencePayload } from '../../../core/models/experience.model';
import { EntityApiService } from '../../../core/services/entity-api.service';

/**
 * Llamadas a `/api/experiences`. Los endpoints comunes vienen de EntityApiService.
 */
@Injectable({ providedIn: 'root' })
export class ExperiencesService extends EntityApiService<Experience, ExperiencePayload> {
  protected readonly path = '/experiences';
}
