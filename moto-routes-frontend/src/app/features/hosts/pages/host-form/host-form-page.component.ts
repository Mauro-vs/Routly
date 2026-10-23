import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';

import { Host, HostPayload } from '../../../../core/models/host.model';
import { FormPageComponent } from '../../../../shared/components/form-page/form-page.component';
import { EntityFormPage } from '../../../../shared/pages/entity-form-page';
import { HostFormComponent } from '../../components/host-form/host-form.component';
import { HostsStore } from '../../services/hosts.store';

/** Crear (`/hosts/new`) y editar (`/hosts/:slug/edit`) un anfitrión. */
@Component({
  selector: 'app-host-form-page',
  imports: [FormPageComponent, HostFormComponent],
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
      (activeChange)="setActive($event)"
      (retry)="retry()"
    >
      <app-host-form
        [record]="record()"
        [users]="store.userOptions.items()"
        [usersLoading]="store.userOptions.loading()"
        (save)="save($event)"
      />
    </ui-form-page>
  `,
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
