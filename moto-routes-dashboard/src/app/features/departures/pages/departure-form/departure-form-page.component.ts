import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';

import { Departure, DeparturePayload } from '../../../../core/models/departure.model';
import { FormPageComponent } from '../../../../shared/components/form-page/form-page.component';
import { EntityFormPage } from '../../../../shared/pages/entity-form-page';
import { DepartureFormComponent } from '../../components/departure-form/departure-form.component';
import { DeparturesStore } from '../../services/departures.store';

/** Crear (`/departures/new`) y editar (`/departures/:slug/edit`) una salida. */
@Component({
  selector: 'app-departure-form-page',
  imports: [FormPageComponent, DepartureFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './departure-form-page.component.html',
})
export class DepartureFormPageComponent extends EntityFormPage<Departure, DeparturePayload> {
  protected readonly store = inject(DeparturesStore);
  protected readonly listPath = '/departures';
  protected readonly form = viewChild(DepartureFormComponent);

  constructor() {
    super();
    // También al editar: dicen cuántas plazas puede tener como mucho.
    void this.store.experienceOptions.load();

    const experienceId = computed(() => this.record()?.experienceId ?? '');
    effect(() => {
      const id = experienceId();
      // Sin seguir sus signals: si no, cada carga volvería a lanzar este efecto.
      if (id) untracked(() => this.store.loadGuideBikes(id));
    });
  }
}
