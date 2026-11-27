import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { DIFFICULTIES, DIFFICULTY_LABELS, RouteDifficulty } from '../../../core/models/route.model';

/** Dificultad de una ruta: tres tramos de medidor y su nombre, para no depender del color. */
@Component({
  selector: 'ui-level-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './level-meter.component.html',
  styleUrl: './level-meter.component.css',
})
export class LevelMeterComponent {
  readonly difficulty = input.required<RouteDifficulty>();

  protected readonly steps = [1, 2, 3];
  protected readonly level = computed(() => DIFFICULTIES.indexOf(this.difficulty()) + 1);
  protected readonly label = computed(() => DIFFICULTY_LABELS[this.difficulty()]);
}
