import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

/**
 * Bloque de una página de detalle, con su título: "Recorrido", "Plazas y precio"...
 *
 *   <ui-detail-section heading="Recorrido">
 *     <ui-field-list [items]="..." />
 *   </ui-detail-section>
 */
@Component({
  selector: 'ui-detail-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail-section.component.html',
  styleUrl: './detail-section.component.css',
})
export class DetailSectionComponent {
  readonly heading = input.required<string>();
  readonly description = input('');

  protected readonly headingId = `detail-section-${nextId++}`;
}
