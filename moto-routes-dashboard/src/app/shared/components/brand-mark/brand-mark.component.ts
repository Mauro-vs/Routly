import { ChangeDetectionStrategy, Component } from '@angular/core';

let nextId = 0;

/**
 * Logo de Routly: la R (con su cuchilla) arranca una carretera que corre bajo el nombre y acaba en
 * la cola de la y. Es el mismo dibujo que docs/assets/logo.svg, pero toma el color del texto.
 * Es decorativo: el enlace que lo contiene lleva el nombre accesible.
 */
@Component({
  selector: 'ui-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 4 271 92" focusable="false">
      <g transform="translate(20 0) skewX(-16)">
        <!-- La línea central de la carretera se recorta: deja ver el fondo -->
        <mask [attr.id]="maskId" maskUnits="userSpaceOnUse" x="-40" y="0" width="330" height="110">
          <rect x="-40" y="0" width="330" height="110" fill="#fff" />
          <path d="M86 86H246" fill="none" stroke="#000" stroke-width="2.4" stroke-dasharray="10 5" />
        </mask>
        <g [attr.mask]="'url(#' + maskId + ')'">
          <path
            fill="currentColor"
            fill-rule="evenodd"
            d="M-12 13L16 10H62L80 28V44L66 58H58L78.2 80H258V86L252 92H71.2L40 58H34V92H16V26ZM34 26H56L64 34V42H34Z"
          />
          <g fill="none" stroke="currentColor" stroke-width="13" stroke-linejoin="miter">
            <path d="M98 46H120V68H98Z" />
            <path d="M140 40V62L146 68H160M160 40V74" />
            <path d="M182 24V62L188 68H196M174 46H194" />
            <path d="M212 22V74" />
            <path d="M230 40V60L236 66H252M252 40V82" />
          </g>
        </g>
      </g>
    </svg>
  `,
  styles: `
    :host {
      display: block;
      flex: none;
      color: var(--color-accent);
    }

    svg {
      display: block;
      width: auto;
      height: var(--brand-height, 32px);
    }
  `,
  host: { 'aria-hidden': 'true' },
})
export class BrandMarkComponent {
  // Un id por instancia: el sidebar puede estar dos veces en la página (escritorio y cajón)
  protected readonly maskId = `routly-road-${nextId++}`;
}
