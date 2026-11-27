import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';

import { Host, HostPayload } from '../../../../core/models/host.model';
import { FormPageComponent } from '../../../../shared/components/form-page/form-page.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { EntityFormPage } from '../../../../shared/pages/entity-form-page';
import { HostFormComponent } from '../../components/host-form/host-form.component';
import { HostsStore } from '../../services/hosts.store';

/** Crear (`/hosts/new`) y editar (`/hosts/:slug/edit`) un anfitrión. */
@Component({
  selector: 'app-host-form-page',
  imports: [FormPageComponent, HostFormComponent, ImageGalleryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './host-form-page.component.html',
})
export class HostFormPageComponent extends EntityFormPage<Host, HostPayload> {
  protected readonly store = inject(HostsStore);
  protected readonly listPath = '/hosts';
  protected readonly form = viewChild(HostFormComponent);

  constructor() {
    super();
    void this.store.userOptions.load();
  }
}
