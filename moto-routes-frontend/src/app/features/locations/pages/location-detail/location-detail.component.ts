import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import {
  Location,
  locationCoordinates,
  locationMapUrl,
} from '../../../../core/models/location.model';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { EntityDetailPage } from '../../../../shared/pages/entity-detail-page';
import { LocationsStore } from '../../services/locations.store';

/** Detalle de una ubicación (`/locations/:slug`). */
@Component({
  selector: 'app-location-detail',
  imports: [DetailPageComponent, DetailSectionComponent, FieldListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-detail-page
      [title]="title()"
      [subtitle]="subtitle()"
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
      <ui-detail-section heading="Lugar">
        <ui-field-list [columns]="2" [items]="place()" />
      </ui-detail-section>
      <ui-detail-section heading="Coordenadas" description="En grados decimales.">
        <ui-field-list [columns]="2" [items]="coordinates()" />
      </ui-detail-section>
    </ui-detail-page>
  `,
})
export class LocationDetailComponent extends EntityDetailPage<Location> {
  protected readonly store = inject(LocationsStore);
  protected readonly listPath = '/locations';

  protected readonly subtitle = computed(() => {
    const location = this.record();
    return location ? [location.region, location.country].filter(Boolean).join(', ') : '';
  });

  protected readonly place = computed<FieldItem[]>(() => {
    const location = this.record();
    if (!location) return [];
    return [
      { label: 'Ciudad', value: location.city },
      { label: 'Región', value: location.region, empty: 'Sin región' },
      { label: 'País', value: location.country },
    ];
  });

  protected readonly coordinates = computed<FieldItem[]>(() => {
    const location = this.record();
    if (!location) return [];
    if (locationCoordinates(location) === null) {
      return [{ label: 'Latitud y longitud', value: null, empty: 'Sin coordenadas', wide: true }];
    }
    return [
      { label: 'Latitud', value: location.latitude, format: 'mono' },
      { label: 'Longitud', value: location.longitude, format: 'mono' },
      { label: 'Mapa', value: 'Ver en OpenStreetMap', href: locationMapUrl(location), wide: true },
    ];
  });
}
