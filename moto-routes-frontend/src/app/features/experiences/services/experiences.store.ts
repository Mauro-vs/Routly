import { Injectable, inject } from '@angular/core';

import { Experience, ExperiencePayload } from '../../../core/models/experience.model';
import { EntityStore } from '../../../core/services/entity.store';
import { CollectionLabels } from '../../../shared/utils/labels';
import { ExperiencesService } from './experiences.service';

/** Cómo se nombra la colección en los textos del panel. */
export const EXPERIENCE_LABELS: CollectionLabels = {
  singular: 'experiencia',
  plural: 'experiencias',
  gender: 'f',
};

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
  readonly labels = EXPERIENCE_LABELS;

  displayName(experience: Experience): string {
    return experience.title;
  }
}
