import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { DIFFICULTIES, DIFFICULTY_LABELS, RouteDifficulty } from '../../../core/models/route.model';

/** Dificultad de una ruta: tres tramos de medidor y su nombre, para no depender del color. */
@Component({
  selector: 'ui-level-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="segments" aria-hidden="true">
      @for (step of steps; track step) {
        <i [class.is-on]="step <= level()"></i>
      }
    </span>
    {{ label() }}
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      white-space: nowrap;
    }

    .segments {
      display: inline-flex;
      gap: 2px;
    }

    i {
      width: 13px;
      height: 8px;
      background: var(--color-meter-track);
    }

    i.is-on {
      background: var(--color-meter);
    }
  `,
})
export class LevelMeterComponent {
  readonly difficulty = input.required<RouteDifficulty>();

  protected readonly steps = [1, 2, 3];
  protected readonly level = computed(() => DIFFICULTIES.indexOf(this.difficulty()) + 1);
  protected readonly label = computed(() => DIFFICULTY_LABELS[this.difficulty()]);
}
