import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Cabecera de página: título, una línea de contexto y las acciones a la derecha.
 *
 *   <ui-page-header title="Rutas" subtitle="5 rutas.">
 *     <button class="btn btn--primary">Guardar</button>
 *   </ui-page-header>
 */
@Component({
  selector: 'ui-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.css',
  host: { class: 'on-band band' },
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
