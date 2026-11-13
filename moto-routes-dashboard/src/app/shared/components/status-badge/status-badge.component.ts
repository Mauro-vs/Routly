import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { DEPARTURE_STATE_LABELS, DepartureState } from '../../../core/models/departure.model';
import { EntityStatus } from '../../../core/models/entity.model';
import { Gender, capitalize, statusWord } from '../../utils/labels';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icons.generated';

export type BadgeStatus = EntityStatus | DepartureState;

interface StatusBadgeView {
  label: string;
  icon: IconName;
  /** Clase de color de primitives.css. */
  tone: string;
}

const TONES: Record<BadgeStatus, { icon: IconName; tone: string }> = {
  active: { icon: 'check-circle', tone: 'badge--success' },
  inactive: { icon: 'eye-slash', tone: 'badge--off' },
  scheduled: { icon: 'calendar-blank', tone: 'badge--info' },
  cancelled: { icon: 'x-circle', tone: 'badge--danger' },
  completed: { icon: 'calendar-check', tone: 'badge--neutral' },
};

function isEntityStatus(status: BadgeStatus): status is EntityStatus {
  return status === 'active' || status === 'inactive';
}

/** Texto, icono y color de una insignia de estado. */
export function statusBadge(status: BadgeStatus, gender: Gender): StatusBadgeView {
  const label = isEntityStatus(status)
    ? capitalize(statusWord(status, gender))
    : DEPARTURE_STATE_LABELS[status];
  return { label, ...TONES[status] };
}

/**
 * Insignia de estado: activo o inactivo, y el estado de una salida
 * (programada, cancelada o realizada). Lleva siempre icono y texto, así que no
 * depende solo del color.
 *
 *   <ui-status-badge [status]="ruta.status" gender="f" />
 */
@Component({
  selector: 'ui-status-badge',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge badge--icon" [class]="view().tone">
      <ui-icon [name]="view().icon" />{{ view().label }}
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<BadgeStatus>();
  /** Para concertar el texto: "Activa" (una ruta) o "Activo" (un usuario). */
  readonly gender = input<Gender>('m');

  protected readonly view = computed(() => statusBadge(this.status(), this.gender()));
}
