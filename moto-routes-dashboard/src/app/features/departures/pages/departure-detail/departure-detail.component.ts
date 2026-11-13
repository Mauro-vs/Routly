import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Departure } from '../../../../core/models/departure.model';
import { BikeCardComponent } from '../../../../shared/components/bike-card/bike-card.component';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { EntityDetailPage } from '../../../../shared/pages/entity-detail-page';
import { DeparturesStore } from '../../services/departures.store';

/** Detalle de una salida (`/departures/:slug`). Su SKU va bajo el título. */
@Component({
  selector: 'app-departure-detail',
  imports: [BikeCardComponent, DetailPageComponent, DetailSectionComponent, FieldListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-detail-page
      [title]="title()"
      [subtitle]="record()?.sku ?? ''"
      [labels]="store.labels"
      [record]="record()"
      [failed]="loadFailed()"
      [identifier]="identifier()"
      [editPath]="editPath()"
      [busy]="busy()"
      (activeChange)="setActive($event)"
      (remove)="remove()"
      (retry)="retry()"
    >
      <ui-detail-section heading="Experiencia">
        <ui-field-list [columns]="2" [items]="experience()" />
      </ui-detail-section>
      <ui-detail-section heading="Moto del guía">
        @if (record()?.guideBike; as bike) {
          <ui-bike-card
            [bike]="bike"
            [link]="['/bikes', bike.slug]"
            [note]="record()?.guideBikeId ? '' : 'Moto de la experiencia'"
          />
        } @else {
          <p class="muted">Sin moto asignada.</p>
        }
      </ui-detail-section>
      <ui-detail-section heading="Fechas" description="En tu hora local.">
        <ui-field-list [columns]="2" [items]="dates()" />
      </ui-detail-section>
      <ui-detail-section heading="Plazas y precio">
        <ui-field-list [columns]="2" [items]="sale()" />
      </ui-detail-section>
    </ui-detail-page>
  `,
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
