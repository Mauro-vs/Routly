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
  templateUrl: './experience-form-page.component.html',
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
