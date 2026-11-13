import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';

import { Location, LocationPayload } from '../../../../core/models/location.model';
import { FormPageComponent } from '../../../../shared/components/form-page/form-page.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { EntityFormPage } from '../../../../shared/pages/entity-form-page';
import { LocationFormComponent } from '../../components/location-form/location-form.component';
import { LocationsStore } from '../../services/locations.store';

/** Crear (`/locations/new`) y editar (`/locations/:slug/edit`) una ubicación. */
@Component({
  selector: 'app-location-form-page',
  imports: [FormPageComponent, LocationFormComponent, ImageGalleryComponent],
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
      ownsImages
      (activeChange)="setActive($event)"
      (retry)="retry()"
    >
      <app-location-form [record]="record()" (save)="save($event)" />
      @if (record(); as owner) {
        <app-image-gallery
          ownerType="location"
          [ownerId]="owner._id"
          [ownerLabel]="heading()"
          (coverChange)="refreshCover()"
        />
      }
    </ui-form-page>
  `,
})
export class LocationFormPageComponent extends EntityFormPage<Location, LocationPayload> {
  protected readonly store = inject(LocationsStore);
  protected readonly listPath = '/locations';
  protected readonly form = viewChild(LocationFormComponent);
}
