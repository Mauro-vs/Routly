import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';

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
  template: `
    <ui-form-page
      [heading]="heading()"
      [labels]="store.labels"
      [isEdit]="isEdit()"
      [loading]="loading()"
      [failed]="loadFailed()"
      [saving]="saving()"
      [cancelPath]="cancelPath()"
      [active]="isActive()"
      (activeChange)="setActive($event)"
      (retry)="retry()"
    >
      <app-departure-form
        [record]="record()"
        [experiences]="store.experienceOptions.items()"
        [experiencesLoading]="store.experienceOptions.loading()"
        (save)="save($event)"
      />
    </ui-form-page>
  `,
})
export class DepartureFormPageComponent extends EntityFormPage<Departure, DeparturePayload> {
  protected readonly store = inject(DeparturesStore);
  protected readonly listPath = '/departures';
  protected readonly form = viewChild(DepartureFormComponent);

  constructor() {
    super();
    // También al editar: dicen cuántas plazas puede tener como mucho.
    void this.store.experienceOptions.load();
  }
}
