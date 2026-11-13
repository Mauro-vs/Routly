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
  template: `
    <div class="head__text">
      <h1>{{ title() }}</h1>
      @if (subtitle()) {
        <p>{{ subtitle() }}</p>
      }
    </div>
    <div class="head__actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--space-4);
      margin-block-end: 20px;
    }

    .head__text {
      min-width: 0;
    }

    h1 {
      overflow-wrap: anywhere;
    }

    p {
      margin-top: 6px;
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .head__actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .head__actions:empty {
      display: none;
    }

    /* En móvil los botones proyectados se reparten el ancho: ver primitives.css. */
    @media (max-width: 560px) {
      .head__actions {
        width: 100%;
      }
    }
  `,
  host: { class: 'on-band band' },
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
