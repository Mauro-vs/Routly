import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Una dirección que no existe: se dice y se ofrece por dónde seguir. */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="on-band">
      <div class="wrap lost">
        <h1>Esta carretera no lleva a ninguna parte</h1>
        <p>La página que buscas no existe o ha cambiado de dirección.</p>
        <a class="btn-primary" routerLink="/experiencias">Ver las experiencias</a>
      </div>
    </section>
  `,
  styles: `
    .lost {
      display: grid;
      justify-items: start;
      gap: var(--space-4);
      padding-block: var(--space-7) calc(var(--space-7) * 2);
    }

    h1 {
      max-width: 18ch;
      font-size: clamp(32px, 5vw, 64px);
      font-weight: 850;
      letter-spacing: -0.04em;
      line-height: 0.95;
    }

    p {
      color: var(--color-on-band-muted);
    }
  `,
})
export class NotFoundPageComponent {}
