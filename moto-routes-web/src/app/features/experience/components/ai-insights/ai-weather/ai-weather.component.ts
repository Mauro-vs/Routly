import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AiWeather, AiWeatherDay, WeatherIcon, WeatherWarning } from '../../../../../core/ai/ai.models';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { IconName } from '../../../../../shared/ui/icon/icons.generated';
import { SkeletonComponent } from '../../../../../shared/ui/skeleton/skeleton.component';
import { formatNumber, formatShortDate, formatWeekdayDate } from '../../../../../shared/utils/shop-format';
import { Piece } from '../ai-insights.store';

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
  templateUrl: './ai-weather.component.html',
  styleUrl: './ai-weather.component.css',
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
