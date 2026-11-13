import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ShopExperience } from '../../../../core/api/shop.models';
import { DifficultyComponent } from '../../../../shared/ui/difficulty/difficulty.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { sceneFor } from '../../../../shared/ui/photo/landscape';
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
        <ui-photo [src]="experience().coverImage?.url ?? null" [seed]="experience().slug" [scene]="scene()" alt="" />
        @if (route()?.category; as category) {
          <!-- El tipo de carretera, como una placa de señal: verde con su filete blanco -->
          <span class="plate">{{ category.name }}</span>
        }
        @if (route()) {
          <span class="km num"><span class="cap" aria-hidden="true"></span><strong>{{ km() }}</strong> km</span>
        }
      </div>
      <div class="body">
        <h3>{{ experience().title }}</h3>
        @if (route(); as route) {
          <p class="where">
            <span>{{ route.startLocation?.city }}</span>
            @if (route.endLocation && route.endLocation.city !== route.startLocation?.city) {
              <ui-icon name="arrow-right" class="to" /><span class="sr-only"> hasta </span><span>{{ route.endLocation.city }}</span>
            }
          </p>
          <p class="meta">
            <span class="num">{{ hours() }} de ruta</span>
            <ui-difficulty [value]="route.difficulty" />
            @if (experience().host; as host) {
              <span class="host">con {{ host.name }}</span>
            }
          </p>
        }
        <div class="bottom">
          @if (experience().nextDepartureAt; as next) {
            <p class="next">
              <span class="label">Próxima salida</span>
              <strong class="num">{{ date(next) }}</strong>
            </p>
          } @else {
            <p class="next none"><span class="label">Sin fechas por ahora</span></p>
          }
          @if (experience().priceFrom !== null) {
            <p class="price"><span class="label">desde</span> <strong class="num">{{ price() }}</strong></p>
          }
        </div>
      </div>
    </a>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    /* Una pieza: foto arriba, a sangre, y el texto en su panel. Tan alta como su celda, con el pie
       abajo, así la fecha y el precio quedan a la misma altura en toda la fila */
    a {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      color: inherit;
      text-decoration: none;
      box-shadow: var(--shadow-1);
      transition:
        transform var(--motion-base) var(--motion-ease),
        box-shadow var(--motion-base) var(--motion-ease),
        border-color var(--motion-base) var(--motion-ease);
    }

    a:focus-visible {
      outline: 3px solid var(--color-accent);
      outline-offset: 3px;
    }

    @media (hover: hover) and (pointer: fine) {
      a:hover {
        transform: translateY(-4px);
        border-color: var(--color-border-strong);
        box-shadow: var(--shadow-2);
      }

      a:hover ui-photo ::ng-deep img,
      a:hover ui-photo ::ng-deep svg {
        transform: scale(1.04);
      }

      a:hover h3 {
        text-decoration: underline;
        text-decoration-color: var(--color-accent);
        text-decoration-thickness: 2px;
        text-underline-offset: 4px;
      }
    }

    a:active {
      transform: translateY(-1px);
    }

    @media (prefers-reduced-motion: reduce) {
      a,
      a:hover,
      ui-photo ::ng-deep img,
      ui-photo ::ng-deep svg {
        transform: none;
        transition: border-color var(--motion-base) linear;
      }
    }

    .media {
      position: relative;
    }

    ui-photo {
      aspect-ratio: 4 / 3;
    }

    ui-photo ::ng-deep img,
    ui-photo ::ng-deep svg {
      transition: transform var(--motion-slow) var(--motion-ease);
    }

    /* La placa del tipo de carretera, arriba a la izquierda de la foto */
    .plate {
      position: absolute;
      top: var(--space-3);
      left: var(--space-3);
      padding: 4px 9px;
      border-radius: 4px;
      background: var(--sign);
      box-shadow: inset 0 0 0 2px var(--sign), inset 0 0 0 3px var(--sign-rule), 0 4px 10px -4px rgb(0 0 0 / 0.6);
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    /* El hito kilométrico, apoyado en el borde de la foto como un mojón en la cuneta */
    .km {
      position: absolute;
      right: var(--space-3);
      bottom: -14px;
      z-index: 1;
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

    .body {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-4) var(--space-4) 0;
    }

    h3 {
      /* Hueco a la derecha para el hito, que asoma por encima */
      padding-right: 72px;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.2;
      text-wrap: balance;
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
      color: var(--color-accent);
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1) var(--space-3);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .host {
      overflow-wrap: anywhere;
    }

    /* El pie: la próxima salida y el precio, lo que se compara entre tarjetas, en grande */
    .bottom {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: var(--space-3);
      margin: auto calc(var(--space-4) * -1) 0;
      margin-top: auto;
      padding: var(--space-3) var(--space-4);
      border-top: 1px dashed var(--color-border-strong);
      background: var(--color-surface-2);
    }

    .label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }

    .next strong {
      font-size: 17px;
      font-weight: 800;
    }

    .none .label {
      text-transform: none;
      letter-spacing: 0;
      font-size: var(--text-sm);
      font-weight: 500;
    }

    .price {
      text-align: right;
    }

    .price strong {
      font-size: 26px;
      font-weight: 850;
      letter-spacing: -0.03em;
      line-height: 1;
    }
  `,
})
export class ExperienceCardComponent {
  readonly experience = input.required<ShopExperience>();
  /** El paisaje de su tipo de carretera, si la foto no está o no carga */
  protected readonly scene = computed(() => sceneFor(this.experience().route?.category?.name));

  protected readonly route = computed(() => this.experience().route);
  protected readonly km = computed(() => formatKm(this.route()?.distance ?? 0));
  protected readonly hours = computed(() => formatHours(this.route()?.duration ?? 0));
  protected readonly price = computed(() => formatPrice(this.experience().priceFrom ?? 0));
  protected readonly date = formatShortDate;
}
