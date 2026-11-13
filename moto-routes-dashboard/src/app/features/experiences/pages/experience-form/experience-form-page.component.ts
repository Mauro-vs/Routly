import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';

import { Experience, ExperiencePayload } from '../../../../core/models/experience.model';
import { FormPageComponent } from '../../../../shared/components/form-page/form-page.component';
import { ImageGalleryComponent } from '../../../../shared/components/image-gallery/image-gallery.component';
import { EntityFormPage } from '../../../../shared/pages/entity-form-page';
import { ExperienceFormComponent } from '../../components/experience-form/experience-form.component';
import { ExperiencesStore } from '../../services/experiences.store';

/** Crear (`/experiences/new`) y editar (`/experiences/:slug/edit`) una experiencia. */
@Component({
  selector: 'app-experience-form-page',
  imports: [FormPageComponent, ExperienceFormComponent, ImageGalleryComponent],
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
      <app-experience-form
        [record]="record()"
        [hosts]="store.hostOptions.items()"
        [routes]="store.routeOptions.items()"
        [optionsLoading]="optionsLoading()"
        [guideBikes]="store.guideBikes.items()"
        [guideBikesLoading]="store.guideBikes.loading()"
        (hostChange)="store.loadGuideBikes($event)"
        (save)="save($event)"
      />
      @if (record(); as owner) {
        <app-image-gallery
          ownerType="experience"
          [ownerId]="owner._id"
          [ownerLabel]="heading()"
          (coverChange)="refreshCover()"
        />
      }
    </ui-form-page>
  `,
})
export class ExperienceFormPageComponent extends EntityFormPage<Experience, ExperiencePayload> {
  protected readonly store = inject(ExperiencesStore);
  protected readonly listPath = '/experiences';
  protected readonly form = viewChild(ExperienceFormComponent);

  protected readonly optionsLoading = computed(
    () => this.store.hostOptions.loading() || this.store.routeOptions.loading(),
  );

  constructor() {
    super();
    void this.store.hostOptions.load();
    void this.store.routeOptions.load();

    const hostId = computed(() => this.record()?.hostId ?? '');
    effect(() => {
      const id = hostId();
      // Sin seguir sus signals: si no, cada carga volvería a lanzar este efecto.
      if (id) untracked(() => this.store.loadGuideBikes(id));
    });
  }
}
