import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ApiError } from '../../../core/models/api-error.model';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { IconComponent } from '../icon/icon.component';
import { IconName } from '../icon/icons.generated';

interface ErrorView {
  icon: IconName;
  description: string;
  /** Reintentar solo tiene sentido si el fallo puede arreglarse solo (la red, el servidor). */
  canRetry: boolean;
}

// Lo que se cuenta según qué ha fallado. Sin error conocido, se supone la conexión.
const VIEWS = {
  unauthorized: {
    icon: 'lock-simple',
    description: 'Inicia sesión para ver esta sección. Es una sección solo para administradores.',
    canRetry: false,
  },
  forbidden: {
    icon: 'prohibit',
    description: 'Tu cuenta no tiene permiso para ver esta sección.',
    canRetry: false,
  },
  timeout: {
    icon: 'clock',
    description: 'La API ha tardado demasiado en responder. Vuelve a intentarlo.',
    canRetry: true,
  },
  server: {
    icon: 'warning',
    description: 'La API ha fallado al procesar la petición. Vuelve a intentarlo en unos minutos.',
    canRetry: true,
  },
  network: {
    icon: 'wifi-slash',
    description: 'Comprueba que la API está en marcha y vuelve a intentarlo.',
    canRetry: true,
  },
} as const satisfies Record<string, ErrorView>;

function viewFor(error: ApiError | null): ErrorView {
  if (error?.isUnauthorized) return VIEWS.unauthorized;
  if (error?.isForbidden) return VIEWS.forbidden;
  if (error?.type === 'timeout') return VIEWS.timeout;
  if (error?.type === 'server') return VIEWS.server;
  return VIEWS.network;
}

/**
 * Lo que se ve cuando una carga falla: qué ha pasado y, si sirve de algo, un botón para
 * reintentarlo. Con `error` cuenta el motivo real: sin sesión (401), sin permiso (403),
 * la API no responde o ha fallado. Sin él, supone que no hay conexión.
 *
 *   <ui-error-state title="No se han podido cargar las rutas" [error]="store.error()" (retry)="reload()" />
 */
@Component({
  selector: 'ui-error-state',
  imports: [EmptyStateComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-empty-state tone="danger" [icon]="view().icon" [title]="title()" [description]="view().description">
      @if (view().canRetry) {
        <button type="button" class="btn btn--secondary" (click)="retry.emit()">
          <ui-icon name="arrows-clockwise" />Reintentar
        </button>
      }
    </ui-empty-state>
  `,
  host: { role: 'alert' },
})
export class ErrorStateComponent {
  readonly title = input('No se han podido cargar los datos');
  readonly error = input<ApiError | null>(null);
  readonly retry = output<void>();

  protected readonly view = computed(() => viewFor(this.error()));
}
