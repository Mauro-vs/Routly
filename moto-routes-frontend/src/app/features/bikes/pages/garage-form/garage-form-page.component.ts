import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';

import { Bike, BikePayload } from '../../../../core/models/bike.model';
import { FormPageComponent } from '../../../../shared/components/form-page/form-page.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { EntityFormPage } from '../../../../shared/pages/entity-form-page';
import { BikeFormComponent } from '../../components/bike-form/bike-form.component';
import { GarageStore } from '../../services/bikes.store';

/**
 * Añadir (`/profile/garage/new`) y editar (`/profile/garage/:slug`) una moto del garaje propio.
 * Al crearla se queda aquí, para poder subirle las fotos.
 */
@Component({
  selector: 'app-garage-form-page',
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
      <app-bike-form [record]="record()" (save)="save($event)" />
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
export class GarageFormPageComponent extends EntityFormPage<Bike, BikePayload> {
  protected readonly store = inject(GarageStore);
  protected readonly listPath = '/profile/garage';
  protected readonly form = viewChild(BikeFormComponent);

  protected override readonly cancelPath = computed(() => this.listPath);

  protected override pathAfterSaving(slug: string, created: boolean): unknown[] {
    return created ? [this.listPath, slug] : [this.listPath];
  }
}
