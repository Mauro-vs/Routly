import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Difficulty } from '../../../core/api/shop.models';

const LEVELS: Record<Difficulty, { level: number; label: string }> = {
  easy: { level: 1, label: 'Fácil' },
  medium: { level: 2, label: 'Media' },
  hard: { level: 3, label: 'Difícil' },
};

/** La dificultad en tres tramos inclinados y con su nombre: nunca solo con color. */
@Component({
  selector: 'ui-difficulty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './difficulty.component.html',
  styleUrl: './difficulty.component.css',
})
export class DifficultyComponent {
  readonly value = input.required<Difficulty>();
  protected readonly info = computed(() => LEVELS[this.value()]);
}
