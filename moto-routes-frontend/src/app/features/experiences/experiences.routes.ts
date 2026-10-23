import { Routes } from '@angular/router';

import { collectionRoutes } from '../../shared/pages/collection-routes';
import { EXPERIENCE_LABELS } from './services/experiences.store';

/** Páginas de las experiencias. El formulario es el mismo para crear y para editar. */
export const EXPERIENCES_ROUTES: Routes = collectionRoutes({
  labels: EXPERIENCE_LABELS,
  title: 'Experiencias',
  list: () =>
    import('./pages/experiences-list/experiences-list.component').then(
      (m) => m.ExperiencesListComponent,
    ),
  detail: () =>
    import('./pages/experience-detail/experience-detail.component').then(
      (m) => m.ExperienceDetailComponent,
    ),
  form: () =>
    import('./pages/experience-form/experience-form-page.component').then(
      (m) => m.ExperienceFormPageComponent,
    ),
  trash: () =>
    import('./pages/experiences-trash/experiences-trash.component').then(
      (m) => m.ExperiencesTrashComponent,
    ),
});
