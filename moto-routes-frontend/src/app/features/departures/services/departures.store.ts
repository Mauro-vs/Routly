import { Injectable, inject } from '@angular/core';

import { Departure, DeparturePayload } from '../../../core/models/departure.model';
import { EntityStore } from '../../../core/services/entity.store';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { OptionList } from '../../../core/services/option-list';
import { formatDate } from '../../../shared/utils/format';
import { CollectionLabels } from '../../../shared/utils/labels';
import { DeparturesService } from './departures.service';

/** Cómo se nombra la colección en los textos del panel. */
export const DEPARTURE_LABELS: CollectionLabels = {
  singular: 'salida',
  plural: 'salidas',
  gender: 'f',
};

/**
 * Estado de las salidas con signals: carga, edición, filtro por estado, borrado y
 * papelera vienen de EntityStore. Aquí se añaden las experiencias activas para el
 * select del formulario.
 */
@Injectable({ providedIn: 'root' })
export class DeparturesStore extends EntityStore<Departure, DeparturePayload> {
  protected readonly api = inject(DeparturesService);
  protected readonly listPath = '/departures';
  protected override readonly notFoundMessage = 'Esa salida ya no existe.';
  readonly labels = DEPARTURE_LABELS;

  /** Experiencias activas: la API no deja crear una salida de una inactiva. */
  readonly experienceOptions = new OptionList(
    () => this.api.getExperienceOptions(),
    inject(ErrorHandlerService),
  );

  /** "Costa Brava en moto, 8 nov 2026": la experiencia y el día. */
  displayName(departure: Departure): string {
    const title = departure.experience?.title ?? 'Salida';
    return `${title}, ${formatDate(departure.startAt)}`;
  }

  /** Por qué no se puede restaurar todavía: su experiencia sigue en la papelera. */
  restoreBlockedReason(departure: Departure): string | null {
    return departure.experience
      ? null
      : 'No se puede restaurar mientras su experiencia siga en la papelera.';
  }
}
