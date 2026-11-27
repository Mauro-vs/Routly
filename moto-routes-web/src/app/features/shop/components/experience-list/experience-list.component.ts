import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ShopExperience } from '../../../../core/api/shop.models';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { ExperienceCardComponent } from '../experience-card/experience-card.component';

/**
 * La lista del Shop (List + Card): una rejilla con una tarjeta por experiencia. La primera vez que
 * carga, esqueletos con la forma de las tarjetas; después, mientras llega otra página, se sigue
 * viendo la anterior, atenuada, para no parpadear en vacío.
 */
@Component({
  selector: 'app-experience-list',
  imports: [ExperienceCardComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experience-list.component.html',
  styleUrl: './experience-list.component.css',
})
export class ExperienceListComponent {
  readonly experiences = input.required<ShopExperience[]>();
  /** Aún no ha llegado ninguna página: esqueletos */
  readonly skeleton = input(false);
  /** Está llegando otra página: la de ahora, atenuada */
  readonly stale = input(false);

  protected readonly placeholders = [1, 2, 3, 4, 5, 6];
}
