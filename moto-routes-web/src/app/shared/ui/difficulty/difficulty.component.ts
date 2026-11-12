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
  template: `
    <span class="tramos" aria-hidden="true">
      @for (n of [1, 2, 3]; track n) {
        <i [class.on]="n <= info().level"></i>
      }
    </span>
    {{ info().label }}
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .tramos {
      display: inline-flex;
      gap: 2px;
    }

    i {
      width: 9px;
      height: 6px;
      background: var(--color-meter-track);
      transform: skewX(var(--slant));
    }

    i.on {
      background: var(--color-meter);
    }
  `,
})
export class DifficultyComponent {
  readonly value = input.required<Difficulty>();
  protected readonly info = computed(() => LEVELS[this.value()]);
}
