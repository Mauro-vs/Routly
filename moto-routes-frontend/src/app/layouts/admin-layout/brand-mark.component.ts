import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Símbolo de Routly: el casco sobre la placa lima. Es decorativo. */
@Component({
  selector: 'app-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 6 57 41" fill="none" focusable="false">
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="M32 9C46 9 55 17 55 29C55 34 53.5 38 50 41C47 43.5 43 44 40 42.5C36 41 33 37.5 30 37C26 36.5 21 38 16.5 40C12 37 10 33 10 28C10 16.5 20 9 32 9ZM33 19C39 17.5 47 18.5 51 21C52.5 21.9 52.5 24.5 51 25.6C47 28.5 39 29 34 27.6C32.2 27.1 31.5 25.5 31.8 23.8L32.2 20.8C32.4 19.8 32.4 19.2 33 19Z"
      />
      <path
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        d="M8 24H3M9 30H2.5M8.5 36H4"
      />
    </svg>
  `,
  styles: `
    :host {
      display: grid;
      flex: none;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      background: var(--color-accent);
      color: var(--color-on-accent);
    }

    svg {
      display: block;
      width: 22px;
    }
  `,
  host: { 'aria-hidden': 'true' },
})
export class BrandMarkComponent {}
