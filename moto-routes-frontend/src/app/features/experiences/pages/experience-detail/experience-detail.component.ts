import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Experience, languageName } from '../../../../core/models/experience.model';
import { DetailPageComponent } from '../../../../shared/components/detail-page/detail-page.component';
import { DetailSectionComponent } from '../../../../shared/components/detail-page/detail-section.component';
import { FieldItem, FieldListComponent } from '../../../../shared/components/field-list/field-list.component';
import { EntityDetailPage } from '../../../../shared/pages/entity-detail-page';
import { ExperiencesStore } from '../../services/experiences.store';

/**
 * Detalle de una experiencia (`/experiences/:slug`). Sus salidas no se listan aquí:
 * la API no filtra las salidas por experiencia (propuesta en NOTES.md).
 */
@Component({
  selector: 'app-experience-detail',
  imports: [DetailPageComponent, DetailSectionComponent, FieldListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-detail-page
      [title]="title()"
      [subtitle]="subtitle()"
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
      <ui-detail-section heading="Ruta y anfitrión">
        <ui-field-list [columns]="2" [items]="relations()" />
      </ui-detail-section>
      <ui-detail-section heading="Grupo">
        <ui-field-list [columns]="2" [items]="group()" />
      </ui-detail-section>
      <ui-detail-section heading="Descripción">
        <ui-field-list [items]="about()" />
      </ui-detail-section>
    </ui-detail-page>
  `,
})
export class ExperienceDetailComponent extends EntityDetailPage<Experience> {
  protected readonly store = inject(ExperiencesStore);
  protected readonly listPath = '/experiences';

  protected readonly subtitle = computed(() => {
    const experience = this.record();
    return experience?.route ? `Sobre ${experience.route.title}` : '';
  });

  protected readonly relations = computed<FieldItem[]>(() => {
    const experience = this.record();
    if (!experience) return [];
    return [
      {
        label: 'Ruta',
        value: experience.route?.title,
        relation: true,
        gender: 'f',
        link: experience.route ? ['/routes', experience.route.slug] : null,
      },
      {
        label: 'Anfitrión',
        value: experience.host?.name,
        relation: true,
        link: experience.host ? ['/hosts', experience.host.slug] : null,
      },
    ];
  });

  protected readonly group = computed<FieldItem[]>(() => {
    const experience = this.record();
    if (!experience) return [];
    return [
      { label: 'Idioma', value: languageName(experience.language) },
      { label: 'Duración', value: experience.duration, format: 'number', unit: 'h' },
      { label: 'Mínimo de participantes', value: experience.minParticipants, format: 'number' },
      { label: 'Máximo de participantes', value: experience.maxParticipants, format: 'number' },
    ];
  });

  protected readonly about = computed<FieldItem[]>(() => {
    const experience = this.record();
    if (!experience) return [];
    return [
      { label: 'Descripción', value: experience.description, format: 'multiline', empty: 'Sin descripción' },
      { label: 'Punto de encuentro', value: experience.meetingPoint, empty: 'Sin indicar' },
    ];
  });
}
