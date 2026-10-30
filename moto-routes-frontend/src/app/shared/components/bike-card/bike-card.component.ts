import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BIKE_TYPE_LABELS, BikeSummary, bikeName } from '../../../core/models/bike.model';
import { RouterPath } from '../../utils/router';
import { IconComponent } from '../icon/icon.component';

/**
 * Ficha compacta de una moto: portada, nombre, tipo, cc, cv y carnet. El carnet es el que da
 * la API. Con `link`, el nombre lleva a su detalle; lo que se proyecte va debajo, como
 * acciones.
 *
 *   <ui-bike-card [bike]="moto" [link]="['/bikes', moto.slug]" note="Moto de la experiencia" />
 */
@Component({
  selector: 'ui-bike-card',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="media">
      @if (bike().coverImage; as cover) {
        <img [src]="cover.url" alt="" loading="lazy" decoding="async" />
      } @else {
        <ui-icon name="motorcycle" />
      }
    </div>
    <div class="body">
      <h3>
        @if (link(); as link) {
          <a class="link" [routerLink]="link">{{ name() }}</a>
        } @else {
          {{ name() }}
        }
      </h3>
      <p class="type">{{ type() }}</p>
      <dl class="specs">
        @if (bike().cc; as cc) {
          <div><dt>Cilindrada</dt><dd class="slanted">{{ cc }}<small>cc</small></dd></div>
        }
        @if (bike().hp; as hp) {
          <div><dt>Potencia</dt><dd class="slanted">{{ hp }}<small>cv</small></dd></div>
        }
        <div><dt>Carnet</dt><dd class="slanted">{{ bike().license }}</dd></div>
      </dl>
      @if (note()) {
        <p class="note">{{ note() }}</p>
      }
      <div class="extra"><ng-content /></div>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 150px minmax(0, 1fr);
      overflow: hidden;
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: inset 0 0 0 1px var(--color-border);
    }

    .media {
      display: grid;
      place-items: center;
      min-height: 120px;
      overflow: hidden;
      background: var(--color-surface-2);
      color: var(--color-text-muted);
      font-size: 42px;
    }

    .media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .body {
      display: grid;
      align-content: start;
      gap: var(--space-1);
      min-width: 0;
      padding: var(--space-3) var(--space-4);
    }

    h3 {
      margin: 0;
      overflow-wrap: anywhere;
      font-size: var(--text-base);
      font-weight: 750;
    }

    h3 a {
      font-weight: inherit;
    }

    .type,
    .note {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }

    .specs {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-5);
      margin: var(--space-1) 0 0;
    }

    dt {
      font-size: 11.5px;
      color: var(--color-text-muted);
    }

    dd {
      margin: 0;
      font-size: var(--text-xl);
      line-height: 1.1;
    }

    small {
      margin-left: 3px;
      font-size: var(--text-xs);
      font-weight: 500;
    }

    .extra:empty {
      display: none;
    }

    .extra {
      margin-top: var(--space-2);
    }

    @media (max-width: 560px) {
      :host {
        grid-template-columns: minmax(0, 1fr);
      }

      .media {
        aspect-ratio: 16 / 9;
        min-height: 0;
      }
    }
  `,
})
export class BikeCardComponent {
  readonly bike = input.required<BikeSummary>();
  readonly link = input<RouterPath | null>(null);
  /** Una aclaración bajo la ficha, por ejemplo que es la heredada de la experiencia. */
  readonly note = input('');

  protected readonly name = computed(() => bikeName(this.bike()));
  protected readonly type = computed(() => BIKE_TYPE_LABELS[this.bike().type]);
}
