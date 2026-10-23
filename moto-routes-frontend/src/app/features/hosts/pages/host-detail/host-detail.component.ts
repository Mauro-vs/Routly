import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Host } from '../../../../core/models/host.model';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { EntityDetailPage } from '../../../../shared/pages/entity-detail-page';
import { HostsStore } from '../../services/hosts.store';

/** Detalle de un anfitrión (`/hosts/:slug`). */
@Component({
  selector: 'app-host-detail',
  imports: [DetailPageComponent, DetailSectionComponent, FieldListComponent],
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
    </ui-detail-page>
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
