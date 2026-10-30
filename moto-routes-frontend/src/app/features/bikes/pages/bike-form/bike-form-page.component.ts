import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';

import { Bike, BikePayload } from '../../../../core/models/bike.model';
import { FormPageComponent } from '../../../../shared/components/form-page/form-page.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { EntityFormPage } from '../../../../shared/pages/entity-form-page';
import { BikeFormComponent } from '../../components/bike-form/bike-form.component';
import { BikesStore } from '../../services/bikes.store';

/** Crear (`/bikes/new`) y editar (`/bikes/:slug/edit`) una moto desde el panel. */
@Component({
  selector: 'app-bike-form-page',
  imports: [FormPageComponent, BikeFormComponent, ImageGalleryComponent],
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
      <app-bike-form
        [record]="record()"
        [owners]="store.ownerOptions.items()"
        [ownersLoading]="store.ownerOptions.loading()"
        (save)="save($event)"
      />
      @if (record(); as owner) {
        <app-image-gallery
          ownerType="bike"
          [ownerId]="owner._id"
          [ownerLabel]="heading()"
          (coverChange)="refreshCover()"
        />
      }
    </ui-form-page>
  `,
})
export class BikeFormPageComponent extends EntityFormPage<Bike, BikePayload> {
  protected readonly store = inject(BikesStore);
  protected readonly listPath = '/bikes';
  protected readonly form = viewChild(BikeFormComponent);

  constructor() {
    super();
    void this.store.ownerOptions.load();
  }
}
