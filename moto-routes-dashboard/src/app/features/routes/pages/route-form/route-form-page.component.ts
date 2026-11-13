import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';

import { Route, RoutePayload } from '../../../../core/models/route.model';
import { FormPageComponent } from '../../../../shared/components/form-page/form-page.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { EntityFormPage } from '../../../../shared/pages/entity-form-page';
import { RouteFormComponent } from '../../components/route-form/route-form.component';
import { RoutesStore } from '../../services/routes.store';

/** Crear (`/routes/new`) y editar (`/routes/:slug/edit`) una ruta. */
@Component({
  selector: 'app-route-form-page',
  imports: [FormPageComponent, RouteFormComponent, ImageGalleryComponent],
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
      <app-route-form
        [record]="record()"
        [categories]="store.categoryOptions.items()"
        [locations]="store.locationOptions.items()"
        [optionsLoading]="optionsLoading()"
        (save)="save($event)"
      />
      @if (record(); as owner) {
        <app-image-gallery
          ownerType="route"
          [ownerId]="owner._id"
          [ownerLabel]="heading()"
          (coverChange)="refreshCover()"
        />
      }
    </ui-form-page>
  `,
})
export class RouteFormPageComponent extends EntityFormPage<Route, RoutePayload> {
  protected readonly store = inject(RoutesStore);
  protected readonly listPath = '/routes';
  protected readonly form = viewChild(RouteFormComponent);

  protected readonly optionsLoading = computed(
    () => this.store.categoryOptions.loading() || this.store.locationOptions.loading(),
  );

  constructor() {
    super();
    // Se piden cada vez: puede haber categorías o ubicaciones nuevas, o desactivadas.
    void this.store.categoryOptions.load();
    void this.store.locationOptions.load();
  }
}
