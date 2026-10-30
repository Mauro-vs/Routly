import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BrandMarkComponent } from '../../../../shared/components/brand-mark/brand-mark.component';
import { ThemeToggleComponent } from '../../../../shared/components/theme-toggle/theme-toggle.component';

/**
 * Marco del inicio de sesión y del registro: a un lado la marca, con la carretera del logo
 * dibujándose al entrar, y al otro el formulario, que se proyecta dentro. Es el único sitio
 * del panel donde la expresión va por delante, y solo se ve una vez por sesión.
 */
@Component({
  selector: 'app-auth-shell',
  imports: [BrandMarkComponent, ThemeToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth">
      <section class="brand on-band" aria-label="Routly">
        <svg class="road" viewBox="0 0 720 1000" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
          <defs>
            <mask id="road-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="720" height="1000">
              <path class="road__draw" pathLength="1" [attr.d]="roadPath" fill="none" stroke="#fff" stroke-width="150" />
            </mask>
          </defs>
          <g mask="url(#road-reveal)" fill="none">
            <path [attr.d]="roadPath" class="road__asphalt" stroke-width="96" />
            <path [attr.d]="roadPath" class="road__edge" stroke-width="84" />
            <path [attr.d]="roadPath" class="road__fill" stroke-width="80" />
            <path [attr.d]="roadPath" class="road__line" stroke-width="4" stroke-dasharray="26 20" />
          </g>
        </svg>
        <div class="brand__top">
          <ui-brand-mark class="brand__logo" />
        </div>
        <p class="brand__line">Rutas, salidas y motos, a punto para salir.</p>
      </section>

      <section class="form">
        <ui-theme-toggle class="form__theme" />
        <div class="form__inner">
          <ng-content />
        </div>
      </section>
    </main>
  `,
  styles: `
    .auth {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
      min-height: 100dvh;
    }

    /* ---------- la marca ---------- */
    .brand {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: var(--space-5);
      min-height: 100%;
      padding: var(--space-6);
      overflow: hidden;
    }

    .brand__top {
      position: relative;
    }

    .brand__logo {
      --brand-height: clamp(72px, 9vw, 118px);
    }

    .brand__line {
      position: relative;
      max-width: 11em;
      font-size: clamp(1.75rem, 3vw, 2.625rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.08;
      transform: skewX(var(--slant-text));
      transform-origin: left bottom;
      text-wrap: balance;
    }

    .road {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .road__asphalt {
      stroke: var(--color-accent);
    }

    .road__edge {
      stroke: var(--color-band);
    }

    .road__fill {
      stroke: var(--color-sidebar-raised);
    }

    .road__line {
      stroke: var(--color-accent);
    }

    /* la carretera se dibuja una vez, de abajo arriba */
    .road__draw {
      stroke-dasharray: 1;
      stroke-dashoffset: 0;
      animation: road-draw 1100ms var(--motion-ease) both;
    }

    @keyframes road-draw {
      from {
        stroke-dashoffset: 1;
      }
    }

    /* ---------- el formulario ---------- */
    .form {
      position: relative;
      display: grid;
      place-items: center;
      padding: var(--space-6) var(--space-5);
    }

    .form__theme {
      position: absolute;
      top: var(--space-3);
      right: var(--space-3);
    }

    .form__inner {
      display: grid;
      gap: var(--space-4);
      width: min(100%, 380px);
    }

    @media (max-width: 900px) {
      .auth {
        grid-template-columns: minmax(0, 1fr);
        align-content: start;
      }

      /* en móvil la marca se queda en una banda, con el logo y su carretera */
      .brand {
        min-height: 164px;
        padding: var(--space-5) var(--space-4);
      }

      .brand__logo {
        --brand-height: 56px;
      }

      .brand__line {
        display: none;
      }

      /* a la derecha del logo: por detrás lo cruzaría */
      .road {
        left: 62%;
        width: 60%;
      }

      .form {
        place-items: start center;
        padding: var(--space-5) var(--space-4);
      }

      .form__theme {
        --color-text-muted: var(--color-on-band);
        --color-text: var(--color-on-band);
        --color-surface-2: rgb(255 255 255 / 0.12);
        top: -156px;
        right: var(--space-2);
        z-index: 1;
      }
    }
  `,
})
export class AuthShellComponent {
  /** De la esquina inferior a la superior: una curva enlazada, como un tramo de puerto. */
  protected readonly roadPath =
    'M 780 1010 C 590 930 330 860 370 680 C 410 510 690 540 650 350 C 625 220 430 190 400 -60';
}
