import { Injectable, inject } from '@angular/core';

import { Experience, ExperiencePayload } from '../../../core/models/experience.model';
import { EntityStore } from '../../../core/services/entity.store';
import { ExperiencesService } from './experiences.service';

/**
 * Estado de las experiencias con signals: carga, edición, cambio de estado optimista y
 * papelera vienen de EntityStore. Todavía no tiene páginas; `listPath` es la ruta
 * que tendrá su listado.
 */
@Injectable({ providedIn: 'root' })
export class ExperiencesStore extends EntityStore<Experience, ExperiencePayload> {
  protected readonly api = inject(ExperiencesService);
  protected readonly listPath = '/experiences';
  protected override readonly notFoundMessage = 'Esa experiencia ya no existe.';
}
