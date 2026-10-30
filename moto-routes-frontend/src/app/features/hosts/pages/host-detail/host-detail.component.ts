import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Host } from '../../../../core/models/host.model';
import { BikeCardComponent } from '../../../../shared/components/bike-card/bike-card.component';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-detail-page
      [title]="title()"
      [thumbnail]="record()?.coverImage?.url ?? null"
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
      <ui-detail-section heading="Perfil público">
        <ui-field-list [items]="profile()" />
      </ui-detail-section>
      <ui-detail-section heading="Cuenta" description="El usuario con el que entra en la plataforma.">
        <ui-field-list [columns]="2" [items]="account()" />
      </ui-detail-section>
      <ui-detail-section heading="Sus motos">
        @for (bike of record()?.bikes; track bike._id) {
          <ui-bike-card class="bike" [bike]="bike" [link]="['/bikes', bike.slug]" />
        } @empty {
          <p class="muted">Todavía no tiene motos en su garaje.</p>
        }
      </ui-detail-section>
      @if (record(); as owner) {
        <app-image-gallery
          ownerType="host"
          [ownerId]="owner._id"
          [ownerLabel]="title()"
          (coverChange)="refreshCover()"
        />
      }
    </ui-detail-page>
  `,
  styles: `
    .bike + .bike {
      margin-top: var(--space-3);
    }
  `,
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
