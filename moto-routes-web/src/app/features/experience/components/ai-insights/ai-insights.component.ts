import { ChangeDetectionStrategy, Component, effect, inject, input, untracked } from '@angular/core';

import { ChatStore } from '../../../../layout/ai-chat/chat.store';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { formatShortDate } from '../../../../shared/utils/shop-format';
import { AiRouteMapComponent } from './ai-route-map/ai-route-map.component';
import { AiStopsComponent } from './ai-stops/ai-stops.component';
import { AiWeatherComponent } from './ai-weather/ai-weather.component';
import { AiInsightsStore } from './ai-insights.store';

/** Preguntas de ejemplo para el asistente, debajo del bloque */
const QUESTIONS = ['¿Vale para alguien que lleva poco en moto?', '¿Qué tiempo hará en la próxima salida?'];

/**
 * Lo que la IA añade al detalle, en cinco piezas con el mismo estilo que el resto de la ficha (sin
 * tarjeta ni cartel propio: una marca pequeña en lo escrito con IA y una nota al final).
 *
 * - Resumen y para quién es, qué llevar y preguntas frecuentes: textos escritos por la IA con los
 *   datos de la experiencia (GET /ai/experiences/:slug/insights). Llevan la etiqueta de IA.
 * - El mapa del recorrido con dónde comer, miradores y gasolineras (OSRM y OpenStreetMap), el tiempo de
 *   las fechas de salida (Open-Meteo) y las paradas (OpenStreetMap): datos reales, no IA.
 *
 * Las cuatro peticiones las hace su store (ai-insights.store.ts), a la vez, y cada pieza enseña lo
 * suyo: si no hay IA configurada (503), los textos no salen, y el mapa, el tiempo y las paradas sí.
 */
@Component({
  selector: 'app-ai-insights',
  imports: [IconComponent, SkeletonComponent, AiWeatherComponent, AiStopsComponent, AiRouteMapComponent],
  providers: [AiInsightsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-insights.component.html',
  styleUrl: './ai-insights.component.css',
})
export class AiInsightsComponent {
  /** El slug de la experiencia */
  readonly slug = input.required<string>();

  protected readonly store = inject(AiInsightsStore);
  protected readonly chat = inject(ChatStore);

  protected readonly questions = QUESTIONS;
  protected readonly shortDate = formatShortDate;

  constructor() {
    // Solo depende del slug: lo que lee load() (las piezas) no vuelve a lanzar el efecto
    effect(() => {
      const slug = this.slug();
      untracked(() => this.store.load(slug));
    });
  }
}
