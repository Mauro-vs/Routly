import { Injectable, inject } from '@angular/core';

import { Experience, ExperiencePayload } from '../../../core/models/experience.model';
import { EntityStore } from '../../../core/services/entity.store';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { OptionList } from '../../../core/services/option-list';
import { CollectionLabels } from '../../../shared/utils/labels';
import { ExperiencesService } from './experiences.service';

/** Cómo se nombra la colección en los textos del panel. */
export const EXPERIENCE_LABELS: CollectionLabels = {
  singular: 'experiencia',
  plural: 'experiencias',
  gender: 'f',
};

/**
 * Estado de las experiencias con signals: carga, edición, filtro por estado, borrado
 * y papelera vienen de EntityStore. Aquí se añaden los anfitriones y las rutas
 * activos para los selects del formulario.
 */
@Injectable({ providedIn: 'root' })
export class ExperiencesStore extends EntityStore<Experience, ExperiencePayload> {
  protected readonly api = inject(ExperiencesService);
  protected readonly listPath = '/experiences';
  protected override readonly notFoundMessage = 'Esa experiencia ya no existe.';
  readonly labels = EXPERIENCE_LABELS;

  private readonly errorHandler = inject(ErrorHandlerService);
  /** Anfitriones activos: la API no deja asignar uno inactivo. */
  readonly hostOptions = new OptionList(() => this.api.getHostOptions(), this.errorHandler);
  /** Rutas activas: la API no deja asignar una inactiva. */
  readonly routeOptions = new OptionList(() => this.api.getRouteOptions(), this.errorHandler);

  displayName(experience: Experience): string {
    return experience.title;
  }

  /**
   * Por qué no se puede restaurar todavía: su ruta o su anfitrión siguen en la
   * papelera, y la API respondería 409.
   */
  restoreBlockedReason(experience: Experience): string | null {
    const missing = [
      experience.route ? null : 'su ruta',
      experience.host ? null : 'su anfitrión',
    ].filter((reference) => reference !== null);
    if (missing.length === 0) return null;
    const verb = missing.length > 1 ? 'sigan' : 'siga';
    return `No se puede restaurar mientras ${missing.join(' y ')} ${verb} en la papelera.`;
  }
}
