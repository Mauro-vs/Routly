import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AiStop, AiStops, AiStopsAround } from '../../../../../core/ai/ai.models';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { IconName } from '../../../../../shared/ui/icon/icons.generated';
import { SkeletonComponent } from '../../../../../shared/ui/skeleton/skeleton.component';
import { formatNumber } from '../../../../../shared/utils/shop-format';
import { Piece } from '../ai-insights.store';

const FOOD_KINDS: Record<string, string> = {
  restaurant: 'Restaurante',
  cafe: 'Cafetería',
  fast_food: 'Comida rápida',
  bar: 'Bar',
  pub: 'Bar',
};

/**
 * Paradas reales cerca de la salida y la llegada (GET /ai/experiences/:slug/stops): dónde comer,
 * gasolineras y miradores de OpenStreetMap, no IA. Cada sitio enlaza a su ficha en el mapa.
 */
@Component({
  selector: 'app-ai-stops',
  imports: [IconComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-stops.component.html',
  styleUrl: './ai-stops.component.css',
})
export class AiStopsComponent {
  readonly piece = input.required<Piece<AiStops>>();

  protected readonly number = formatNumber;

  /** La salida y, si no es circular, la llegada, con sus tres grupos */
  protected points(data: AiStops) {
    const groups = (around: AiStopsAround) => [
      { title: 'Dónde comer', icon: 'fork-knife' as IconName, unnamed: 'Sin nombre', stops: around.food },
      { title: 'Gasolineras', icon: 'gas-pump' as IconName, unnamed: 'Gasolinera', stops: around.fuel },
      { title: 'Miradores', icon: 'binoculars' as IconName, unnamed: 'Mirador sin nombre', stops: around.viewpoints },
    ];
    const list = [{ label: `Cerca de ${data.start.place.city}${data.end ? ' (salida)' : ''}`, groups: groups(data.start) }];
    if (data.end) list.push({ label: `Cerca de ${data.end.place.city} (llegada)`, groups: groups(data.end) });
    return list;
  }

  /** " · Restaurante · spanish · 13:00-16:00": lo que ayuda a elegir */
  protected stopDetail(stop: AiStop): string {
    const details = [stop.category ? FOOD_KINDS[stop.category] : null, stop.cuisine[0] ?? null, stop.openingHours].filter(Boolean);
    return details.length > 0 ? ` · ${details.join(' · ')}` : '';
  }
}
