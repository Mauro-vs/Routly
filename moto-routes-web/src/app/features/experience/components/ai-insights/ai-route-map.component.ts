import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import type * as Leaflet from 'leaflet';

import { AiPlaceKind, AiRouteMap, AiRoutePlace } from '../../../../core/ai/ai.models';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { IconName } from '../../../../shared/ui/icon/icons.generated';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { formatHours, formatNumber, plural } from '../../../../shared/utils/shop-format';
import { Piece } from './piece';

/** Las teselas del mapa: las de OpenStreetMap, gratis para un uso moderado con su atribución. */
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const CATEGORIES: Record<string, string> = { restaurant: 'Restaurante', cafe: 'Cafetería' };

/** Cómo se enseña cada tipo de sitio: en la leyenda, en la lista y en el mapa */
const KINDS: Record<AiPlaceKind, { title: string; legend: string; unnamed: string; icon: IconName; fill: string; stroke: string }> = {
  food: { title: 'Dónde comer', legend: 'Dónde comer', unnamed: 'Restaurante', icon: 'fork-knife', fill: '#f97316', stroke: '#9a3412' },
  viewpoint: { title: 'Miradores', legend: 'Miradores', unnamed: 'Mirador', icon: 'binoculars', fill: '#3b82f6', stroke: '#1e3a8a' },
  fuel: { title: 'Gasolineras', legend: 'Gasolineras', unnamed: 'Gasolinera', icon: 'gas-pump', fill: '#facc15', stroke: '#854d0e' },
};
const KIND_ORDER: AiPlaceKind[] = ['food', 'viewpoint', 'fuel'];

/**
 * El mapa del detalle (GET /ai/experiences/:slug/route): el recorrido por carretera desde la salida,
 * por los puntos de paso, hasta la llegada, y lo que hay a lo largo: dónde comer, miradores y
 * gasolineras. No es IA: el
 * recorrido es de OSRM y los sitios, de OpenStreetMap.
 *
 * Leaflet se carga al pintar el mapa (import dinámico), así no pesa en el resto de la web. Todo lo
 * de OpenStreetMap se mete en el mapa como texto, nunca como HTML.
 */
@Component({
  selector: 'app-ai-route-map',
  imports: [IconComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="block" aria-labelledby="ia-recorrido">
      <h2 id="ia-recorrido">El recorrido</h2>
      @switch (piece().status) {
        @case ('loading') {
          <ui-skeleton height="360px" aria-hidden="true" />
        }
        @case ('ready') {
          @if (piece().data; as data) {
            <p class="trip">{{ trip(data) }}@if (length(data); as length) {<span class="muted num"> · {{ length }}</span>}</p>
            <div #map class="map" role="region" aria-label="Mapa del recorrido con dónde comer, miradores y gasolineras"></div>
            <ul class="legend small muted">
              <li><span class="dot dot--start"></span>Salida@if (!data.end) { y llegada}</li>
              @if (data.waypoints.length > 0) {
                <li><span class="dot dot--waypoint"></span>Puntos de paso</li>
              }
              @if (data.end) {
                <li><span class="dot dot--end"></span>Llegada</li>
              }
              @for (group of groups(); track group.kind) {
                <li><span class="dot" [style.background]="group.fill" [style.border-color]="group.stroke"></span>{{ group.legend }}</li>
              }
            </ul>
            @if (!data.routed && data.line) {
              <p class="small muted">No hemos podido calcular la carretera: la línea une los puntos en recto.</p>
            }
            @switch (data.placesStatus) {
              @case ('loading') {
                <p class="small muted" role="status">Buscando dónde comer, miradores y gasolineras a lo largo del recorrido…</p>
              }
              @case ('unavailable') {
                <p class="small muted">Los sitios del recorrido no están disponibles ahora mismo.</p>
              }
              @default {
                @if (groups().length === 0) {
                  <p class="small muted">No hay sitios en el mapa cerca del recorrido.</p>
                } @else {
                  <details class="list">
                    <summary><ui-icon name="list" /> Ver en lista ({{ summary() }})</summary>
                    <div class="groups">
                      @for (group of groups(); track group.kind) {
                        <div class="group">
                          <p class="group-title"><ui-icon [name]="group.icon" /> {{ group.title }}</p>
                          <ul class="places">
                            @for (place of group.places; track place.url) {
                              <li>
                                <a [href]="place.url" target="_blank" rel="noopener noreferrer">{{ place.name ?? group.unnamed }}</a>
                                <span class="small muted num">{{ detail(place) }}</span>
                              </li>
                            }
                          </ul>
                        </div>
                      }
                    </div>
                  </details>
                }
              }
            }
          }
        }
        @default {
          <p class="muted">El mapa no está disponible ahora mismo.</p>
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

    h2 {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    .muted {
      color: var(--color-text-muted);
    }

    .small {
      font-size: var(--text-sm);
    }

    .trip {
      font-weight: 650;
    }

    .map {
      height: 360px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      /* Leaflet pone sus capas con z-index altos: que no tapen la cabecera ni el chat */
      isolation: isolate;
      z-index: 0;
      background: var(--color-surface-2);
    }

    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-4);
    }

    .legend li {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
    }

    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid var(--color-primary);
      background: var(--color-primary);
    }

    .dot--waypoint {
      background: var(--color-surface);
    }

    .dot--end {
      border-color: var(--color-text);
      background: var(--color-text);
    }


    .list summary {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-primary);
      font-weight: 700;
      cursor: pointer;
    }

    .groups {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-4);
      margin-top: var(--space-3);
    }

    .group-title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-weight: 750;
    }

    .places {
      display: grid;
      gap: var(--space-2);
      margin-top: var(--space-2);
    }

    .places li {
      display: grid;
    }

    a {
      color: var(--color-primary);
      font-weight: 650;
    }

    /* Lo de dentro del mapa (los globos de cada sitio) lo crea Leaflet: ::ng-deep para llegar */
    :host ::ng-deep .leaflet-popup-content {
      display: grid;
      gap: 2px;
      margin: 10px 14px;
      font: inherit;
      font-size: var(--text-sm);
    }

    :host ::ng-deep .leaflet-popup-content strong {
      font-size: var(--text-base);
    }

    :host ::ng-deep .leaflet-popup-content a {
      color: var(--color-primary);
      font-weight: 650;
    }
  `,
})
export class AiRouteMapComponent {
  readonly piece = input.required<Piece<AiRouteMap>>();

  private readonly mapElement = viewChild<ElementRef<HTMLElement>>('map');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private map: Leaflet.Map | null = null;
  private mapOn: HTMLElement | null = null;
  private layers: Leaflet.LayerGroup | null = null;
  private drawing = 0;

  protected readonly plural = plural;
  /** Los sitios por tipo, en el orden del recorrido; solo los tipos que tienen alguno */
  protected readonly groups = computed(() => {
    const places = this.piece().data?.places ?? [];
    return KIND_ORDER.map((kind) => ({ kind, ...KINDS[kind], places: places.filter((place) => place.kind === kind) })).filter(
      (group) => group.places.length > 0,
    );
  });

  /** "12 para comer, 3 miradores y 2 gasolineras" */
  protected readonly summary = computed(() => {
    const words: Record<AiPlaceKind, [string, string]> = {
      food: ['sitio para comer', 'sitios para comer'],
      viewpoint: ['mirador', 'miradores'],
      fuel: ['gasolinera', 'gasolineras'],
    };
    const parts = this.groups().map((group) => plural(group.places.length, ...words[group.kind]));
    return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}` : (parts[0] ?? '');
  });

  constructor() {
    effect(() => {
      const data = this.piece().data;
      const element = this.mapElement()?.nativeElement;
      if (data && element) void this.draw(element, data);
    });
    inject(DestroyRef).onDestroy(() => this.removeMap());
  }

  /** "Jaca → Biescas → Sabiñánigo": por dónde pasa, en orden */
  protected trip(data: AiRouteMap): string {
    const stops = [data.start.city, ...data.waypoints.map((point) => point.name).filter((name) => name !== null)];
    stops.push(data.end?.city ?? data.start.city);
    return data.line ? stops.join(' → ') : `Sale y vuelve a ${data.start.city}`;
  }

  /** "61 km por carretera, unas 1,1 h" */
  protected length(data: AiRouteMap): string | null {
    if (data.distanceKm === null) return null;
    const hours = data.durationH !== null ? `, unas ${formatHours(data.durationH)} sin paradas` : '';
    return `${formatNumber(Math.round(data.distanceKm))} km por carretera${hours}`;
  }

  /** "Restaurante · spanish · a 0,4 km del recorrido" */
  protected detail(place: AiRoutePlace): string {
    const category = place.category ? CATEGORIES[place.category] ?? null : null;
    return [category, place.cuisine[0] ?? null, `a ${formatNumber(place.distanceKm)} km del recorrido`].filter(Boolean).join(' · ');
  }

  private async draw(element: HTMLElement, data: AiRouteMap): Promise<void> {
    // Si llegan datos nuevos mientras carga Leaflet, solo pinta la última vez
    const turn = ++this.drawing;
    const L = await loadLeaflet();
    if (turn !== this.drawing || !element.isConnected) return;

    const firstTime = this.mapOn !== element;
    if (firstTime) {
      this.removeMap();
      this.map = L.map(element, { scrollWheelZoom: false, zoomSnap: 0.5 });
      L.tileLayer(TILES, {
        maxZoom: 18,
        attribution: `<a href="${data.sources.map.url}" target="_blank" rel="noopener">${data.sources.map.attribution}</a> · recorrido de <a href="${data.sources.route.url}" target="_blank" rel="noopener">${data.sources.route.name}</a>`,
      }).addTo(this.map);
      this.layers = L.layerGroup().addTo(this.map);
      this.mapOn = element;
    }
    const map = this.map!;
    const layers = this.layers!;
    layers.clearLayers();

    const styles = getComputedStyle(this.host.nativeElement);
    const color = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
    const primary = color('--color-primary', '#14663f');
    const text = color('--color-text', '#0f1a15');
    const surface = color('--color-surface', '#ffffff');

    const start: Leaflet.LatLngTuple = [data.start.latitude, data.start.longitude];
    if (data.line) {
      // Un borde claro debajo para que la línea se lea sobre cualquier tesela
      L.polyline(data.line, { color: surface, weight: 8, opacity: 0.9, interactive: false }).addTo(layers);
      L.polyline(data.line, { color: primary, weight: 5, dashArray: data.routed ? undefined : '8 8' }).addTo(layers);
    }

    for (const place of data.places ?? []) {
      const kind = KINDS[place.kind];
      L.circleMarker([place.latitude, place.longitude], { radius: 6, color: kind.stroke, weight: 2, fillColor: kind.fill, fillOpacity: 1 })
        .bindPopup(() => this.popup(place))
        .bindTooltip(place.name ?? kind.unnamed, { direction: 'top', offset: [0, -6] })
        .addTo(layers);
    }

    for (const point of data.waypoints) {
      const marker = L.circleMarker([point.latitude, point.longitude], { radius: 6, color: primary, weight: 3, fillColor: surface, fillOpacity: 1 });
      if (point.name) marker.bindTooltip(point.name, { direction: 'top', offset: [0, -6] });
      marker.addTo(layers);
    }

    if (data.end) {
      L.circleMarker([data.end.latitude, data.end.longitude], { radius: 8, color: surface, weight: 3, fillColor: text, fillOpacity: 1 })
        .bindTooltip(`Llegada: ${data.end.city}`, { direction: 'top', offset: [0, -8] })
        .addTo(layers);
    }
    L.circleMarker(start, { radius: 8, color: surface, weight: 3, fillColor: primary, fillOpacity: 1 })
      .bindTooltip(data.end ? `Salida: ${data.start.city}` : `Salida y llegada: ${data.start.city}`, { direction: 'top', offset: [0, -8] })
      .addTo(layers);

    // El encuadre solo la primera vez: si luego llegan los sitios, no se mueve lo que se mira
    if (firstTime) {
      const points: Leaflet.LatLngExpression[] = data.line ?? [start, ...(data.places ?? []).map((p): Leaflet.LatLngTuple => [p.latitude, p.longitude])];
      if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [24, 24] });
      else map.setView(start, 13);
    }
  }

  // El globo de un sitio, hecho con nodos de texto (los nombres vienen de OpenStreetMap)
  private popup(place: AiRoutePlace): HTMLElement {
    const box = document.createElement('div');
    const line = (tag: string, value: string) => {
      const node = document.createElement(tag);
      node.textContent = value;
      box.append(node);
      return node;
    };
    line('strong', place.name ?? KINDS[place.kind].unnamed);
    line('span', this.detail(place));
    if (place.openingHours) line('span', `Horario: ${place.openingHours}`);
    const link = line('a', 'Ver en OpenStreetMap') as HTMLAnchorElement;
    link.href = place.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return box;
  }

  private removeMap(): void {
    this.map?.remove();
    this.map = null;
    this.mapOn = null;
    this.layers = null;
  }
}

// Leaflet es CommonJS: según cómo lo empaquete el build, llega como módulo o en default
async function loadLeaflet(): Promise<typeof Leaflet> {
  const module = (await import('leaflet')) as typeof Leaflet & { default?: typeof Leaflet };
  return module.default ?? module;
}
