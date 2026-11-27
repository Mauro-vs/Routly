import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import {
  BIKE_TYPE_LABELS,
  Bike,
  MODIFICATION_TYPE_LABELS,
} from '../../../../core/models/bike.model';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { EntityDetailPage } from '../../../../shared/pages/entity-detail-page';
import { formatDate } from '../../../../shared/utils/format';
import { BikesStore } from '../../services/bikes.store';

/** Detalle de una moto (`/bikes/:slug`): su ficha, sus modificaciones y sus fotos. */
@Component({
  selector: 'app-bike-detail',
  imports: [DetailPageComponent, DetailSectionComponent, FieldListComponent, ImageGalleryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bike-detail.component.html',
  styleUrl: './bike-detail.component.css',
})
export class BikeDetailComponent extends EntityDetailPage<Bike> {
  protected readonly store = inject(BikesStore);
  protected readonly listPath = '/bikes';
  protected readonly modificationLabels = MODIFICATION_TYPE_LABELS;
  protected readonly date_ = formatDate;

  protected readonly subtitle = computed(() => {
    const bike = this.record();
    if (!bike) return '';
    return [BIKE_TYPE_LABELS[bike.type], bike.isPrimary && 'Principal', !bike.isPublic && 'Privada']
      .filter(Boolean)
      .join(' · ');
  });

  protected readonly identity = computed<FieldItem[]>(() => {
    const bike = this.record();
    if (!bike) return [];
    return [
      {
        label: 'Dueño',
        value: bike.user?.name,
        relation: true,
        link: bike.user ? ['/users', bike.user.slug] : null,
      },
      { label: 'Marca', value: bike.brand },
      { label: 'Modelo', value: bike.model },
      { label: 'Versión', value: bike.version },
      { label: 'Apodo', value: bike.nickname },
      { label: 'Color', value: bike.color },
    ];
  });

  protected readonly specs = computed<FieldItem[]>(() => {
    const bike = this.record();
    if (!bike) return [];
    return [
      { label: 'Carnet', value: bike.license },
      { label: 'Año', value: bike.year === undefined ? undefined : String(bike.year) },
      { label: 'Cilindrada', value: bike.cc, format: 'number', unit: 'cc' },
      { label: 'Potencia', value: bike.hp, format: 'number', unit: 'cv' },
      { label: 'Par', value: bike.torque, format: 'number', unit: 'Nm' },
      { label: 'Peso', value: bike.weight, format: 'number', unit: 'kg' },
      { label: 'Altura de asiento', value: bike.seatHeight, format: 'number', unit: 'mm' },
      { label: 'Kilómetros', value: bike.km, format: 'number', unit: 'km' },
    ];
  });
}
