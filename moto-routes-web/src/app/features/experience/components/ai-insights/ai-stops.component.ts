import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { AiStop, AiStops, AiStopsAround } from '../../../../core/ai/ai.models';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { IconName } from '../../../../shared/ui/icon/icons.generated';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { formatNumber } from '../../../../shared/utils/shop-format';
import { Piece } from './piece';

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
  template: `
    <section class="block" aria-labelledby="ia-paradas">
      <h3 id="ia-paradas"><ui-icon name="map-pin" /> Paradas en la ruta</h3>
      @switch (piece().status) {
        @case ('loading') {
          <ui-skeleton height="120px" aria-hidden="true" />
        }
        @case ('ready') {
          @if (piece().data; as data) {
            @for (point of points(data); track point.label) {
              <div class="point">
                <h4>{{ point.label }}</h4>
                <div class="stop-groups">
                  @for (group of point.groups; track group.title) {
                    <div class="stop-group">
                      <p class="stop-title"><ui-icon [name]="group.icon" /> {{ group.title }}</p>
                      @if (group.stops.length === 0) {
                        <p class="muted small">Nada cerca en el mapa.</p>
                      } @else {
                        <ul class="stops">
                          @for (stop of group.stops; track stop.url) {
                            <li>
                              <a [href]="stop.url" target="_blank" rel="noopener noreferrer">{{ stop.name ?? group.unnamed }}</a>
                              <span class="muted small num">{{ number(stop.distanceKm) }} km{{ stopDetail(stop) }}</span>
                            </li>
                          }
                        </ul>
                      }
                    </div>
                  }
                </div>
              </div>
            }
            <p class="muted small">Datos de <a [href]="data.source.url" target="_blank" rel="noopener noreferrer">{{ data.source.attribution }}</a>. Las distancias son en línea recta.</p>
          }
        }
        @default {
          <p class="muted">Las paradas no están disponibles ahora mismo.</p>
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

    h4 {
      font-size: var(--text-base);
      font-weight: 750;
    }

    .point {
      display: grid;
      gap: var(--space-2);
    }

    .stop-groups {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--space-4);
    }

    .stop-title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-weight: 750;
    }

    .stops {
      display: grid;
      gap: var(--space-2);
      margin-top: var(--space-2);
    }

    .stops li {
      display: grid;
    }

    a {
      color: var(--color-primary);
      font-weight: 650;
    }
  `,
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
