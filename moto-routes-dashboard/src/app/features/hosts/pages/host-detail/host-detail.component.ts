import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Host } from '../../../../core/models/host.model';
import { BikeCardComponent } from '../../../../shared/components/bike-card/bike-card.component';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { RatingSummaryComponent } from '../../../../shared/components/rating-summary/rating-summary.component';
import { EntityDetailPage } from '../../../../shared/pages/entity-detail-page';
import { HostsStore } from '../../services/hosts.store';

/** Detalle de un anfitrión (`/hosts/:slug`). */
@Component({
  selector: 'app-host-detail',
  imports: [
    BikeCardComponent,
    DetailPageComponent,
    DetailSectionComponent,
    FieldListComponent,
    ImageGalleryComponent,
    RatingSummaryComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './host-detail.component.html',
  styleUrl: './host-detail.component.css',
})
export class HostDetailComponent extends EntityDetailPage<Host> {
  protected readonly store = inject(HostsStore);
  protected readonly listPath = '/hosts';

  protected readonly profile = computed<FieldItem[]>(() => {
    const host = this.record();
    if (!host) return [];
    return [
      { label: 'Nombre público', value: host.name },
      { label: 'Biografía', value: host.biography, format: 'multiline', empty: 'Sin biografía' },
    ];
  });

  protected readonly account = computed<FieldItem[]>(() => {
    const host = this.record();
    if (!host) return [];
    return [
      {
        label: 'Usuario',
        value: host.user?.name,
        relation: true,
        link: host.user ? ['/users', 'id', host.user._id] : null,
      },
      { label: 'Email', value: host.user?.email },
    ];
  });
}
