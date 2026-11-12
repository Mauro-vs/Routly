import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ShopExperience } from '../../../../core/api/shop.models';
import { DifficultyComponent } from '../../../../shared/ui/difficulty/difficulty.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { PhotoComponent } from '../../../../shared/ui/photo/photo.component';
import { formatHours, formatKm, formatPrice, formatShortDate } from '../../../../shared/utils/shop-format';

/**
 * La tarjeta de una experiencia en el Shop: la foto con su hito kilométrico apoyado en el borde,
 * el título, el recorrido, las horas, la dificultad y el anfitrión, y abajo la próxima fecha y el
 * precio desde. Toda la tarjeta es un enlace al detalle.
 */
@Component({
  selector: 'app-experience-card',
  imports: [RouterLink, PhotoComponent, DifficultyComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="['/experiencias', experience().slug]">
      <div class="media">
        <ui-photo [src]="experience().coverImage?.url ?? null" [seed]="experience().slug" alt="" />
        @if (route()) {
          <span class="km num"><span class="cap" aria-hidden="true"></span><strong>{{ km() }}</strong> km</span>
        }
      </div>
      <h3>{{ experience().title }}</h3>
      @if (route(); as route) {
        <p class="where">
          <span>{{ route.startLocation?.city }}</span>
          @if (route.endLocation && route.endLocation.city !== route.startLocation?.city) {
            <ui-icon name="arrow-right" class="to" /><span class="sr-only"> hasta </span><span>{{ route.endLocation.city }}</span>
          }
        </p>
        <p class="meta">
          <span>{{ route.category?.name }}</span>
          <span class="num">{{ hours() }} de ruta</span>
          <ui-difficulty [value]="route.difficulty" />
        </p>
      }
      @if (experience().host; as host) {
        <p class="host">con {{ host.name }}</p>
      }
      <p class="bottom">
        @if (experience().nextDepartureAt; as next) {
          <span class="num">Próxima salida: <strong>{{ date(next) }}</strong></span>
        } @else {
          <span class="muted">Sin fechas por ahora</span>
        }
        @if (experience().priceFrom !== null) {
          <span class="price num">desde <strong>{{ price() }}</strong></span>
        }
      </p>
    </a>
  `,
  styles: `
    :host {
      display: block;
    }

    a {
      display: grid;
      gap: var(--space-2);
      height: 100%;
      color: inherit;
      text-decoration: none;
      border-radius: var(--radius-lg);
    }

    .media {
      position: relative;
      margin-bottom: var(--space-2);
    }

    ui-photo {
      aspect-ratio: 4 / 3;
      border-radius: var(--radius-lg);
    }

    ui-photo ::ng-deep img,
    ui-photo ::ng-deep svg {
      transition: transform var(--motion-slow) var(--motion-ease);
    }

    a:hover ui-photo ::ng-deep img,
    a:hover ui-photo ::ng-deep svg {
      transform: scale(1.03);
    }

    /* El hito kilométrico, apoyado en el borde de la foto como un mojón en la cuneta */
    .km {
      position: absolute;
      right: var(--space-3);
      bottom: -10px;
      display: grid;
      justify-items: center;
      min-width: 64px;
      overflow: hidden;
      border-radius: 5px 5px 0 0;
      background: var(--plate-paper);
      color: var(--plate-ink);
      font-size: 10px;
      font-weight: 750;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding-bottom: 4px;
      box-shadow: 0 6px 14px -6px rgb(0 0 0 / 0.5);
    }

    .cap {
      align-self: stretch;
      height: 10px;
      background: var(--color-accent);
    }

    .km strong {
      padding: 2px 6px 0;
      font-size: 22px;
      font-weight: 850;
      letter-spacing: -0.02em;
      line-height: 1.1;
      text-transform: none;
    }

    h3 {
      font-size: 19px;
      font-weight: 750;
      letter-spacing: -0.02em;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }

    .where {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0 6px;
      font-weight: 650;
      overflow-wrap: anywhere;
    }

    .to {
      font-size: 14px;
      color: var(--color-text-muted);
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-4);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .host {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .bottom {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--space-2);
      margin-top: auto;
      padding-top: var(--space-3);
      border-top: 1px solid var(--color-border);
      font-size: var(--text-sm);
    }

    .price strong {
      font-size: 20px;
      font-weight: 800;
    }
  `,
})
export class ExperienceCardComponent {
  readonly experience = input.required<ShopExperience>();

  protected readonly route = computed(() => this.experience().route);
  protected readonly km = computed(() => formatKm(this.route()?.distance ?? 0));
  protected readonly hours = computed(() => formatHours(this.route()?.duration ?? 0));
  protected readonly price = computed(() => formatPrice(this.experience().priceFrom ?? 0));
  protected readonly date = formatShortDate;
}
