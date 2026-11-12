import { ChangeDetectionStrategy, Component } from '@angular/core';

/** El Home: los carruseles de tipos de carretera, destinos y anfitriones. Se construye en la fase 4. */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="on-band">
      <div class="wrap placeholder">
        <h1>¿Hacia dónde rodamos?</h1>
        <p>El Home se construye en la siguiente fase.</p>
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
export class HomePageComponent {}
