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
  template: `
    @if (skeleton()) {
      <ul class="grid" aria-hidden="true">
        @for (n of placeholders; track n) {
          <li class="ghost">
            <ui-skeleton class="photo" />
            <ui-skeleton width="80%" height="20px" />
            <ui-skeleton width="55%" height="14px" />
            <ui-skeleton width="70%" height="14px" />
          </li>
        }
      </ul>
    } @else {
      <ul class="grid" [class.is-stale]="stale()">
        @for (experience of experiences(); track experience._id) {
          <li><app-experience-card [experience]="experience" /></li>
        }
      </ul>
    }
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
      gap: var(--space-7) var(--space-5);
      transition: opacity var(--motion-base) var(--motion-ease);
    }

    .grid.is-stale {
      opacity: 0.5;
    }

    .ghost {
      display: grid;
      gap: var(--space-3);
    }

    .ghost .photo {
      height: auto;
      aspect-ratio: 4 / 3;
      border-radius: var(--radius-lg);
    }
  `,
})
export class ExperienceListComponent {
  readonly experiences = input.required<ShopExperience[]>();
  /** Aún no ha llegado ninguna página: esqueletos */
  readonly skeleton = input(false);
  /** Está llegando otra página: la de ahora, atenuada */
  readonly stale = input(false);

  protected readonly placeholders = [1, 2, 3, 4, 5, 6];
}
