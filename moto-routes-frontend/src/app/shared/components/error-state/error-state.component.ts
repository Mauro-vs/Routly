import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { IconComponent } from '../icon/icon.component';

/**
 * Lo que se ve cuando una carga falla: qué ha pasado y un botón para reintentarlo.
 * El detalle del error ya lo ha mostrado ErrorHandlerService en su aviso.
 *
 *   <ui-error-state title="No se han podido cargar las rutas" (retry)="reload()" />
 */
@Component({
  selector: 'ui-error-state',
  imports: [EmptyStateComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-empty-state tone="danger" icon="wifi-slash" [title]="title()" [description]="description()">
      <button type="button" class="btn btn--secondary" (click)="retry.emit()">
        <ui-icon name="arrows-clockwise" />Reintentar
      </button>
    </ui-empty-state>
  `,
  host: { role: 'alert' },
})
export class ErrorStateComponent {
  readonly title = input('No se han podido cargar los datos');
  readonly description = input('Comprueba que la API está en marcha y vuelve a intentarlo.');
  readonly retry = output<void>();
}
