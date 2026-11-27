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
  templateUrl: './location-form-page.component.html',
})
export class LocationFormPageComponent extends EntityFormPage<Location, LocationPayload> {
  protected readonly store = inject(LocationsStore);
  protected readonly listPath = '/locations';
  protected readonly form = viewChild(LocationFormComponent);
}
