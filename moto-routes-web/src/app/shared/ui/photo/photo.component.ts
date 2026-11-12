import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

import { drawLandscape } from './landscape';

/**
 * Una foto que ocupa su caja (object-fit: cover) con su tamaño reservado: quien la usa le da la
 * proporción con `aspect-ratio`, así no hay saltos mientras carga.
 *
 * Debajo siempre está el paisaje de la marca (landscape.ts), y la foto aparece encima cuando llega.
 * Así, sin url, si la foto falla o si el servidor de imágenes no contesta nunca (pasa con picsum),
 * se ve el paisaje y no un hueco ni un icono roto.
 *
 * Las fotos del seed son de 1200 × 800: es el tamaño intrínseco que se declara. La API no da
 * variantes de tamaño, así que no hay srcset.
 */
@Component({
  selector: 'ui-photo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" focusable="false"
      [attr.role]="showsImage() ? null : 'img'" [attr.aria-label]="showsImage() ? null : alt() || null"
      [attr.aria-hidden]="showsImage() || !alt() ? 'true' : null">
        <defs>
          <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" [attr.stop-color]="landscape().sky[0]" />
            <stop offset="1" [attr.stop-color]="landscape().sky[1]" />
          </linearGradient>
        </defs>
        <rect width="1200" height="800" [attr.fill]="'url(#' + gradientId + ')'" />
        <path [attr.d]="landscape().ridges[0]" fill="#5d8577" />
        <path [attr.d]="landscape().ridges[1]" fill="#2f5a47" />
        <path [attr.d]="landscape().ridges[2]" fill="#173a2a" />
        <path [attr.d]="landscape().road" fill="#0f1a15" />
        <path [attr.d]="landscape().line" fill="none" stroke="#c6f04d" stroke-width="6" stroke-dasharray="24 18" />
    </svg>
    @if (showsImage()) {
      <img
        [src]="src()"
        [alt]="alt()"
        width="1200"
        height="800"
        [class.is-loaded]="loaded()"
        [attr.loading]="priority() ? 'eager' : 'lazy'"
        [attr.fetchpriority]="priority() ? 'high' : null"
        decoding="async"
        (load)="loaded.set(true)"
        (error)="failed.set(true)"
      />
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      overflow: hidden;
      background: var(--color-band);
    }

    img,
    svg {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    img {
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity var(--motion-slow) var(--motion-ease);
    }

    img.is-loaded {
      opacity: 1;
    }
  `,
})
export class PhotoComponent {
  readonly src = input<string | null>(null);
  /** Texto alternativo. Vacío si la foto es decorativa (el texto de al lado ya la nombra). */
  readonly alt = input('');
  /** De qué se dibuja el paisaje de recurso: el slug de lo que enseña. */
  readonly seed = input('routly');
  /** La primera imagen de la página (la del Home): se pide enseguida, no al llegar a ella. */
  readonly priority = input(false);

  protected readonly failed = signal(false);
  protected readonly loaded = signal(false);
  protected readonly showsImage = computed(() => !!this.src() && !this.failed());
  protected readonly landscape = computed(() => drawLandscape(this.seed()));
  protected readonly gradientId = `sky-${nextId++}`;

  constructor() {
    // Otra url, otra oportunidad de cargar
    effect(() => {
      this.src();
      this.failed.set(false);
      this.loaded.set(false);
    });
  }
}

let nextId = 0;
