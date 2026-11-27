import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ShopExperience } from '../../../../core/api/shop.models';
import { DifficultyComponent } from '../../../../shared/ui/difficulty/difficulty.component';
import { StarsComponent } from '../../../../shared/ui/stars/stars.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { sceneFor } from '../../../../shared/ui/photo/landscape';
import { PhotoComponent } from '../../../../shared/ui/photo/photo.component';
import { formatHours, formatKm, formatPrice, formatRating, formatShortDate } from '../../../../shared/utils/shop-format';

/**
 * La tarjeta de una experiencia en el Shop: la foto con su hito kilométrico apoyado en el borde,
 * el título, el recorrido, las horas, la dificultad y el anfitrión, y abajo la próxima fecha y el
 * precio desde. Toda la tarjeta es un enlace al detalle.
 */
@Component({
  selector: 'app-experience-card',
  imports: [RouterLink, PhotoComponent, DifficultyComponent, IconComponent, StarsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experience-card.component.html',
  styleUrl: './experience-card.component.css',
})
export class ExperienceCardComponent {
  readonly experience = input.required<ShopExperience>();
  /** El paisaje de su tipo de carretera, si la foto no está o no carga */
  protected readonly scene = computed(() => sceneFor(this.experience().route?.category?.name));

  protected readonly route = computed(() => this.experience().route);
  protected readonly km = computed(() => formatKm(this.route()?.distance ?? 0));
  protected readonly hours = computed(() => formatHours(this.route()?.duration ?? 0));
  protected readonly price = computed(() => formatPrice(this.experience().priceFrom ?? 0));
  protected readonly date = formatShortDate;
  /** "4,6 (12)" */
  protected ratingText(count: number): string {
    return `${formatRating(this.experience().rating?.average ?? 0)} (${count})`;
  }
}
