import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AiWeather, AiWeatherDay, WeatherIcon, WeatherWarning } from '../../../../core/ai/ai.models';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { IconName } from '../../../../shared/ui/icon/icons.generated';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { formatNumber, formatShortDate, formatWeekdayDate } from '../../../../shared/utils/shop-format';
import { Piece } from './piece';

const WEATHER_ICONS: Record<WeatherIcon, IconName> = {
  sun: 'sun',
  'cloud-sun': 'cloud-sun',
  cloud: 'cloud',
  fog: 'cloud-fog',
  drizzle: 'cloud-rain',
  rain: 'cloud-rain',
  snow: 'cloud-snow',
  storm: 'cloud-lightning',
  unknown: 'cloud',
};

const WARNINGS: Record<WeatherWarning, string> = {
  rain: 'Lluvia',
  cold: 'Frío: ojo con el hielo',
  heat: 'Calor',
  wind: 'Viento fuerte',
  storm: 'Tormenta o nieve',
};

/**
 * El tiempo de las próximas salidas, en el punto de salida (GET /ai/experiences/:slug/weather). Son
 * datos de Open-Meteo, no IA: la previsión si la salida es en menos de 16 días y, si no, lo que hizo
 * esos días el año pasado, marcado como referencia. Con avisos para ir en moto.
 */
@Component({
  selector: 'app-ai-weather',
  imports: [IconComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="block" aria-labelledby="ia-tiempo">
      <h3 id="ia-tiempo"><ui-icon name="cloud-sun" /> El tiempo en tus fechas</h3>
      @switch (piece().status) {
        @case ('loading') {
          <ui-skeleton height="96px" aria-hidden="true" />
        }
        @case ('ready') {
          @if (piece().data; as data) {
            @if (data.departures.length === 0) {
              <p class="muted">Cuando haya salidas programadas, aquí verás el tiempo de cada una.</p>
            } @else {
              <p class="muted small">En {{ data.place.city }}, el punto de salida.</p>
              <ul class="departures">
                @for (departure of data.departures; track departure.startAt) {
                  <li class="departure">
                    <p class="departure-head">
                      <strong class="num">{{ weekday(departure.startAt) }}</strong>
                      @if (departure.kind === 'forecast') {
                        <span class="tag">Previsión</span>
                      } @else {
                        <span class="tag tag-muted" title="Aún no hay previsión para esa fecha">Referencia: así fue en {{ departure.referenceYear }}</span>
                      }
                    </p>
                    <ul class="days">
                      @for (day of departure.days; track day.date) {
                        <li class="day">
                          <ui-icon class="day-icon" [name]="weatherIcon(day.icon)" />
                          <span class="day-date num">{{ shortDate(day.date) }}</span>
                          <span class="day-label">{{ day.label }}</span>
                          <span class="day-temp num">{{ degrees(day.max) }} / {{ degrees(day.min) }}</span>
                          <span class="day-meta num">
                            @if (day.rainChance !== null) {<span><ui-icon name="drop" /> {{ day.rainChance }} %</span>}
                            @if (day.wind !== null) {<span><ui-icon name="wind" /> {{ number(day.wind) }} km/h</span>}
                          </span>
                        </li>
                      }
                    </ul>
                    @if (warningsOf(departure.days); as warnings) {
                      @if (warnings.length > 0) {
                        <ul class="warnings" aria-label="Avisos">
                          @for (warning of warnings; track warning) {
                            <li><ui-icon name="warning-circle" /> {{ warningLabel(warning) }}</li>
                          }
                        </ul>
                      }
                    }
                  </li>
                }
              </ul>
            }
          }
        }
        @default {
          <p class="muted">El tiempo no está disponible ahora mismo.</p>
        }
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .block {
      display: grid;
      gap: var(--space-3);
    }

    h3 {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 18px;
      font-weight: 800;
    }

    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .muted {
      color: var(--color-text-muted);
    }

    .small {
      font-size: var(--text-sm);
    }

    .departures {
      display: grid;
      gap: var(--space-3);
    }

    .departure {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .departure-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }

    .tag {
      padding: 0 var(--space-2);
      border-radius: var(--radius-pill);
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-size: var(--text-xs);
      font-weight: 750;
    }

    .tag-muted {
      background: var(--color-surface-2);
      color: var(--color-text-muted);
    }

    .days {
      display: grid;
      gap: var(--space-1);
    }

    .day {
      display: grid;
      grid-template-columns: 24px 64px minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--space-1) var(--space-3);
    }

    .day-icon {
      font-size: 22px;
      color: var(--color-primary);
    }

    .day-date,
    .day-temp {
      font-weight: 700;
      white-space: nowrap;
    }

    .day-meta {
      grid-column: 3 / -1;
      display: flex;
      gap: var(--space-3);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .day-meta span,
    .warnings li {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
    }

    .warnings {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .warnings li {
      padding: 2px var(--space-2);
      border-radius: var(--radius-pill);
      background: var(--color-warning-bg);
      color: var(--color-warning);
      font-size: var(--text-sm);
      font-weight: 700;
    }

    @media (max-width: 560px) {
      .day {
        grid-template-columns: 24px 56px minmax(0, 1fr);
      }

      .day-temp {
        grid-column: 3;
      }
    }
  `,
})
export class AiWeatherComponent {
  readonly piece = input.required<Piece<AiWeather>>();

  protected readonly shortDate = formatShortDate;
  protected readonly weekday = formatWeekdayDate;
  protected readonly number = formatNumber;

  protected weatherIcon(icon: WeatherIcon): IconName {
    return WEATHER_ICONS[icon] ?? 'cloud';
  }

  protected degrees(value: number | null): string {
    return value === null ? '–' : `${Math.round(value)} °C`;
  }

  /** Los avisos de todos los días de una salida, sin repetir */
  protected warningsOf(days: AiWeatherDay[]): WeatherWarning[] {
    return [...new Set(days.flatMap((day) => day.warnings))];
  }

  protected warningLabel(warning: WeatherWarning): string {
    return WARNINGS[warning] ?? warning;
  }
}
