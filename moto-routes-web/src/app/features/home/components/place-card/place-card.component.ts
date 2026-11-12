import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Params, RouterLink } from '@angular/router';

import { PhotoComponent } from '../../../../shared/ui/photo/photo.component';

/**
 * Las placas de la señalización vertical:
 * - `town`: entrada de población, blanca con borde de tinta (los destinos);
 * - `route`: panel verde de orientación (los tipos de carretera);
 * - `guide`: placa lima (los anfitriones).
 */
export type PlateKind = 'town' | 'route' | 'guide';

/**
 * Una tarjeta del Home: la foto y debajo su placa con el nombre y cuántas experiencias tiene.
 * Toda la tarjeta es un enlace al Shop filtrado.
 */
@Component({
  selector: 'app-place-card',
  imports: [RouterLink, PhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="['/experiencias']" [queryParams]="queryParams()">
      <ui-photo [src]="photo()" [seed]="seed()" alt="" />
      <span class="plate" [class]="'plate plate--' + kind()">
        <span class="name">{{ name() }}</span>
        <span class="count num">{{ countLabel() }}</span>
      </span>
    </a>
  `,
  styles: `
    :host {
      display: block;
      width: clamp(232px, 24vw, 290px);
    }

    a {
      display: block;
      color: inherit;
      text-decoration: none;
      border-radius: var(--radius-lg);
    }

    ui-photo {
      aspect-ratio: 4 / 3;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    }

    ui-photo ::ng-deep img,
    ui-photo ::ng-deep svg {
      transition: transform var(--motion-slow) var(--motion-ease);
    }

    a:hover ui-photo ::ng-deep img,
    a:hover ui-photo ::ng-deep svg {
      transform: scale(1.03);
    }

    .plate {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-3);
      min-height: 50px;
      padding: var(--space-3) var(--space-4);
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    }

    .name {
      min-width: 0;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.01em;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }

    .count {
      flex: none;
      font-size: var(--text-sm);
      font-weight: 650;
    }

    .plate--town {
      border: 3px solid var(--plate-ink);
      border-top: 0;
      background: var(--plate-paper);
      color: var(--plate-ink);
    }

    .plate--route {
      background: var(--sign);
      color: var(--on-sign);
    }

    .plate--guide {
      background: var(--color-accent);
      color: var(--color-on-accent);
    }

    @media (max-width: 560px) {
      :host {
        width: 78vw;
      }
    }
  `,
})
export class PlaceCardComponent {
  readonly name = input.required<string>();
  readonly count = input.required<number>();
  readonly photo = input<string | null>(null);
  readonly seed = input.required<string>();
  readonly kind = input.required<PlateKind>();
  /** El filtro del Shop al que lleva: { categoria: 'montana-1a2b' } */
  readonly queryParams = input.required<Params>();

  protected readonly countLabel = computed(() => `${this.count()} ${this.count() === 1 ? 'experiencia' : 'experiencias'}`);
}
