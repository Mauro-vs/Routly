import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ShopRoute } from '../../../../core/api/shop.models';
import { DifficultyComponent } from '../../../../shared/ui/difficulty/difficulty.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { formatHours, formatKm } from '../../../../shared/utils/shop-format';

/**
 * El cartel de la ruta: el panel verde de orientación con el origen y el destino como placas de
 * población, y debajo los kilómetros, las horas de conducción, la dificultad y el tipo de carretera.
 */
@Component({
  selector: 'app-route-sign',
  imports: [DifficultyComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inner">
      <p class="name">{{ route().title }}</p>
      <div class="towns">
        <span class="town">{{ route().startLocation?.city }}</span>
        @if (loop()) {
          <span class="loop">ida y vuelta</span>
        } @else {
          <ui-icon name="arrow-right" class="arrow" />
          <span class="sr-only">hasta</span>
          <span class="town">{{ route().endLocation?.city }}</span>
        }
      </div>
      <dl class="facts">
        <div><dt>Distancia</dt><dd class="num"><strong>{{ km() }}</strong> km</dd></div>
        <div><dt>Conducción</dt><dd class="num">{{ hours() }}</dd></div>
        <div><dt>Dificultad</dt><dd><ui-difficulty [value]="route().difficulty" /></dd></div>
        @if (route().category; as category) {
          <div><dt>Carretera</dt><dd>{{ category.name }}</dd></div>
        }
      </dl>
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding: 6px;
      border-radius: var(--radius-lg);
      background: var(--sign);
      color: var(--on-sign);
      --color-meter: var(--color-accent);
      --color-meter-track: rgb(255 255 255 / 0.25);
    }

    .inner {
      display: grid;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-5);
      border: 3px solid var(--on-sign);
      border-radius: var(--radius-md);
    }

    .name {
      font-size: var(--text-sm);
      font-weight: 700;
      opacity: 0.85;
    }

    .towns {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
    }

    /* La placa de población: blanca con borde de tinta */
    .town {
      padding: 4px 14px;
      border: 3px solid var(--plate-ink);
      border-radius: var(--radius-sm);
      background: var(--plate-paper);
      color: var(--plate-ink);
      font-size: clamp(18px, 2.2vw, 24px);
      font-weight: 850;
      letter-spacing: -0.01em;
    }

    .arrow {
      font-size: 26px;
      font-weight: 800;
    }

    .loop {
      font-weight: 700;
      opacity: 0.85;
    }

    .facts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: var(--space-3) var(--space-4);
      padding-top: var(--space-3);
      border-top: 2px solid var(--sign-rule);
    }

    dt {
      font-size: 11px;
      font-weight: 750;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      opacity: 0.8;
    }

    dd {
      margin: 2px 0 0;
      font-size: 17px;
      font-weight: 700;
    }

    dd strong {
      font-size: 26px;
      font-weight: 850;
      letter-spacing: -0.02em;
    }
  `,
})
export class RouteSignComponent {
  readonly route = input.required<ShopRoute>();

  protected readonly km = computed(() => formatKm(this.route().distance));
  protected readonly hours = computed(() => formatHours(this.route().duration));
  /** Empieza y acaba en el mismo sitio */
  protected readonly loop = computed(() => this.route().startLocation?.slug === this.route().endLocation?.slug);
}
