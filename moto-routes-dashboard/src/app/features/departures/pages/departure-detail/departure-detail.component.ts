import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Departure } from '../../../../core/models/departure.model';
import { BikeCardComponent } from '../../../../shared/components/bike-card/bike-card.component';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { EntityDetailPage } from '../../../../shared/pages/entity-detail-page';
import { DeparturesStore } from '../../services/departures.store';

/** Detalle de una salida (`/departures/:slug`). Su SKU va bajo el título. */
@Component({
  selector: 'app-departure-detail',
  imports: [BikeCardComponent, DetailPageComponent, DetailSectionComponent, FieldListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './departure-detail.component.html',
})
export class DepartureDetailComponent extends EntityDetailPage<Departure> {
  protected readonly store = inject(DeparturesStore);
  protected readonly listPath = '/departures';

  protected readonly experience = computed<FieldItem[]>(() => {
    const departure = this.record();
    if (!departure) return [];
    return [
      {
        label: 'Experiencia',
        value: departure.experience?.title,
        relation: true,
        gender: 'f',
        link: departure.experience ? ['/experiences', departure.experience.slug] : null,
      },
      { label: 'Estado de la salida', value: departure.state, status: departure.state, gender: 'f' },
      { label: 'SKU', value: departure.sku, format: 'mono' },
    ];
  });

  protected readonly dates = computed<FieldItem[]>(() => {
    const departure = this.record();
    if (!departure) return [];
    return [
      { label: 'Inicio', value: departure.startAt, format: 'datetime' },
      { label: 'Fin', value: departure.endAt, format: 'datetime' },
    ];
  });

  protected readonly sale = computed<FieldItem[]>(() => {
    const departure = this.record();
    if (!departure) return [];
    return [
      { label: 'Plazas', value: departure.capacity, format: 'number' },
      { label: 'Precio por persona', value: departure.price, format: 'money' },
    ];
  });
}
