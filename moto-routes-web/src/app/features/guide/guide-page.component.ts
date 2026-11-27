import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageMetaStrategy } from '../../core/services/page-meta.strategy';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PhotoComponent } from '../../shared/ui/photo/photo.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StarsComponent } from '../../shared/ui/stars/stars.component';
import { formatRating, plural } from '../../shared/utils/shop-format';
import { ExperienceCardComponent } from '../shop/components/experience-card/experience-card.component';
import { ReviewsSectionComponent } from '../reviews/reviews-section.component';
import { GuideStore } from './guide.store';

/**
 * La ficha de un guía (/guias/:slug): su foto y su biografía, sus dos notas (como guía, de sus
 * opiniones directas; y en sus experiencias, de todas las opiniones de ellas), sus experiencias
 * como en el Shop y debajo sus opiniones, con el formulario.
 */
@Component({
  selector: 'app-guide-page',
  imports: [RouterLink, PhotoComponent, SkeletonComponent, IconComponent, StarsComponent, ExperienceCardComponent, ReviewsSectionComponent],
  providers: [GuideStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './guide-page.component.html',
  styleUrl: './guide-page.component.css',
})
export class GuidePageComponent {
  /** El :slug de la URL */
  readonly slug = input.required<string>();

  protected readonly store = inject(GuideStore);
  private readonly meta = inject(PageMetaStrategy);
  protected readonly guide = this.store.guide;

  protected readonly scores = computed(() => {
    const guide = this.guide();
    if (!guide) return [];
    const score = (label: string, { average, count }: { average: number; count: number }) => ({
      label,
      value: average,
      average: formatRating(average),
      count,
      countLabel: plural(count, 'opinión', 'opiniones'),
    });
    return [score('como guía', guide.rating), score('en sus experiencias', guide.experiencesRating)];
  });

  constructor() {
    effect(() => void this.store.load(this.slug()));
    effect(() => {
      if (this.store.status() === 'notFound') this.meta.set('Guía no encontrado');
      const guide = this.guide();
      if (guide) this.meta.set(guide.name, guide.biography?.slice(0, 155) ?? `Salidas guiadas en moto con ${guide.name}.`);
    });
  }
}
