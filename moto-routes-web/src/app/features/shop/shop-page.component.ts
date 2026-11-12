import { ChangeDetectionStrategy, Component } from '@angular/core';

/** El Shop: filtros, búsqueda y paginación sincronizados con la URL. Se construye en la fase 5. */
@Component({
  selector: 'app-shop-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="on-band">
      <div class="wrap placeholder">
        <h1>Experiencias</h1>
        <p>El Shop se construye en la fase 5.</p>
      </div>
    </section>
  `,
  styles: `
    .placeholder {
      display: grid;
      gap: var(--space-3);
      padding-block: var(--space-7);
    }

    h1 {
      font-size: clamp(32px, 4.4vw, 54px);
      font-weight: 850;
      letter-spacing: -0.04em;
      line-height: 1;
    }

    p {
      max-width: 60ch;
      color: var(--color-on-band-muted);
    }
  `,
})
export class ShopPageComponent {}
