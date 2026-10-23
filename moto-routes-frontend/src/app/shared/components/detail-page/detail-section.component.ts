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
  template: `
    <section class="card section" [attr.aria-labelledby]="headingId">
      <header class="section__head">
        <h2 [id]="headingId">{{ heading() }}</h2>
        @if (description()) {
          <p>{{ description() }}</p>
        }
      </header>
      <ng-content />
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .section {
      padding: 20px;
    }

    .section__head {
      margin-bottom: var(--space-4);
    }

    h2 {
      font-size: var(--text-lg);
      font-weight: 650;
      letter-spacing: -0.015em;
    }

    p {
      margin-top: 2px;
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }
  `,
})
export class DetailSectionComponent {
  readonly heading = input.required<string>();
  readonly description = input('');

  protected readonly headingId = `detail-section-${nextId++}`;
}
