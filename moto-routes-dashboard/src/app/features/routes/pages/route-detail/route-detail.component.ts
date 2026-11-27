import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { DIFFICULTY_LABELS, Route, routeTrip } from '../../../../core/models/route.model';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { RatingSummaryComponent } from '../../../../shared/components/rating-summary/rating-summary.component';
import { EntityDetailPage } from '../../../../shared/pages/entity-detail-page';
import { RoutesStore } from '../../services/routes.store';

/** Detalle de una ruta (`/routes/:slug`), con su recorrido y su galería. */
@Component({
  selector: 'app-route-detail',
  imports: [DetailPageComponent, DetailSectionComponent, FieldListComponent, ImageGalleryComponent, RatingSummaryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './route-detail.component.html',
})
export class RouteDetailComponent extends EntityDetailPage<Route> {
  protected readonly store = inject(RoutesStore);
  protected readonly listPath = '/routes';

  protected readonly subtitle = computed(() => {
    const route = this.record();
    return route ? routeTrip(route).text : '';
  });

  protected readonly trip = computed<FieldItem[]>(() => {
    const route = this.record();
    if (!route) return [];
    return [
      {
        label: 'Origen',
        value: route.startLocation?.city,
        relation: true,
        gender: 'f',
        link: route.startLocation ? ['/locations', route.startLocation.slug] : null,
      },
      {
        label: 'Destino',
        value: route.endLocation?.city,
        relation: true,
        gender: 'f',
        link: route.endLocation ? ['/locations', route.endLocation.slug] : null,
      },
      { label: 'Distancia', value: route.distance, format: 'number', unit: 'km' },
      { label: 'Duración', value: route.duration, format: 'number', unit: 'h' },
    ];
  });

  protected readonly data = computed<FieldItem[]>(() => {
    const route = this.record();
    if (!route) return [];
    return [
      {
        label: 'Categoría',
        value: route.category?.name,
        relation: true,
        gender: 'f',
        link: route.category ? ['/categories', route.category.slug] : null,
      },
      { label: 'Dificultad', value: DIFFICULTY_LABELS[route.difficulty] },
      {
        label: 'Descripción',
        value: route.description,
        format: 'multiline',
        empty: 'Sin descripción',
        wide: true,
      },
    ];
  });
}
