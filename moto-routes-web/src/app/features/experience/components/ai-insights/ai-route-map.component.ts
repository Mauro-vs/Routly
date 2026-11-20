import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type * as Leaflet from 'leaflet';

import { AiPlaceKind, AiRouteMap, AiRoutePlace } from '../../../../core/ai/ai.models';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ICONS, IconName } from '../../../../shared/ui/icon/icons.generated';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { formatHours, formatNumber } from '../../../../shared/utils/shop-format';
import { Piece } from './piece';

/** Las teselas del mapa: las de OpenStreetMap, gratis para un uso moderado con su atribución. */
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const CATEGORIES: Record<string, string> = { restaurant: 'Restaurante', cafe: 'Cafetería' };

/** Cómo se enseña cada tipo de sitio: en los filtros, en las tarjetas y en el mapa */
const KINDS: Record<AiPlaceKind, { title: string; unnamed: string; icon: IconName; fill: string }> = {
  food: { title: 'Dónde comer', unnamed: 'Restaurante', icon: 'fork-knife', fill: '#ea580c' },
  viewpoint: { title: 'Miradores', unnamed: 'Mirador', icon: 'binoculars', fill: '#2563eb' },
  fuel: { title: 'Gasolineras', unnamed: 'Gasolinera', icon: 'gas-pump', fill: '#ca8a04' },
};
const KIND_ORDER: AiPlaceKind[] = ['food', 'viewpoint', 'fuel'];

/**
 * El mapa del detalle (GET /ai/experiences/:slug/route): el recorrido por carretera desde la salida,
 * por los puntos de paso, hasta la llegada, y lo que hay a lo largo: dónde comer, miradores y
 * gasolineras. No es IA: el recorrido es de OSRM y los sitios, de OpenStreetMap.
 *
 * Arriba, un filtro por tipo (con cuántos hay); en el mapa, un pin con el icono de cada sitio; y debajo,
 * los sitios en tarjetas en el orden del recorrido (km a km): al pulsar una, el mapa va a ese sitio.
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
            @if (groups().length > 0) {
              <div class="filters" role="group" aria-label="Qué enseñar en el mapa">
                @for (group of groups(); track group.kind) {
                  <button
                    type="button"
                    class="chip"
                    [style.--kind]="group.fill"
                    [attr.aria-pressed]="!hidden().has(group.kind)"
                    (click)="toggle(group.kind)"
                  >
                    <span class="badge"><ui-icon [name]="group.icon" /></span>{{ group.title }}<span class="num">{{ group.places.length }}</span>
                  </button>
                }
              </div>
            }
            <div #map class="map" role="region" aria-label="Mapa del recorrido con dónde comer, miradores y gasolineras"></div>
            <ul class="legend small muted">
              <li><span class="dot"></span>Salida@if (!data.end) { y llegada}</li>
              @if (data.waypoints.length > 0) {
                <li><span class="dot dot--waypoint"></span>Puntos de paso</li>
              }
              @if (data.end) {
                <li><span class="dot dot--end"></span>Llegada</li>
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
                  <ol class="cards" aria-label="Sitios en el orden del recorrido">
                    @for (place of shown(); track place.url) {
                      <li>
                        <button type="button" class="card" [style.--kind]="kinds[place.kind].fill" (click)="focus(place)">
                          <span class="badge"><ui-icon [name]="kinds[place.kind].icon" /></span>
                          <span class="name">{{ place.name ?? kinds[place.kind].unnamed }}</span>
                          <span class="small muted num">{{ where(place, data) }}</span>
                        </button>
                      </li>
                    }
                  </ol>
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
    :host,
    .block {
      display: grid;
      gap: var(--space-3);
    }

    h2 {
      font-size: 20px;
      font-weight: 800;
    }

    .muted {
      color: var(--color-text-muted);
    }

    .small {
      font-size: var(--text-sm);
    }

    .trip,
    .name {
      font-weight: 650;
    }

    .map {
      height: 380px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      isolation: isolate;
      background: var(--color-surface-2);
    }

    ul,
    ol {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .filters,
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-4);
    }

    .filters {
      gap: var(--space-2);
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 4px 12px 4px 4px;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: var(--color-surface);
      color: var(--color-text);
      font: inherit;
      font-weight: 650;
      cursor: pointer;
    }

    .chip[aria-pressed='false'] {
      opacity: 0.5;
    }

    .chip .num {
      color: var(--color-text-muted);
    }

    .badge {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      flex: none;
      border-radius: 50%;
      background: var(--kind);
      color: #fff;
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

    .cards {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(200px, 240px);
      gap: var(--space-3);
      overflow-x: auto;
      padding-bottom: var(--space-2);
      scroll-snap-type: x proximity;
    }

    .card {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 2px var(--space-2);
      width: 100%;
      height: 100%;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-top: 4px solid var(--kind);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      color: var(--color-text);
      font: inherit;
      text-align: left;
      cursor: pointer;
      scroll-snap-align: start;
    }

    .card .badge {
      grid-row: span 2;
    }

    /* Lo de dentro del mapa (pines y globos) lo crea Leaflet: ::ng-deep para llegar */
    :host ::ng-deep .pin {
      display: grid;
      place-items: center;
      border: 2px solid #fff;
      border-radius: 50%;
      background: var(--kind);
      box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
    }

    :host ::ng-deep .pin svg {
      width: 15px;
      fill: #fff;
    }

    :host ::ng-deep .leaflet-popup-content {
      display: grid;
      gap: 2px;
      margin: 10px 14px;
      font: inherit;
      font-size: var(--text-sm);
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
  /** Una capa por tipo, para enseñarla o quitarla con el filtro */
  private kindLayers = new Map<AiPlaceKind, Leaflet.LayerGroup>();
  /** El pin de cada sitio (por su url), para ir a él desde su tarjeta */
  private markers = new Map<string, Leaflet.Marker>();
  private drawing = 0;

  protected readonly kinds = KINDS;
  /** Los tipos que el filtro ha quitado */
  protected readonly hidden = signal<ReadonlySet<AiPlaceKind>>(new Set());

  /** Los sitios por tipo; solo los tipos que tienen alguno */
  protected readonly groups = computed(() => {
    const places = this.piece().data?.places ?? [];
    return KIND_ORDER.map((kind) => ({ kind, ...KINDS[kind], places: places.filter((place) => place.kind === kind) })).filter(
      (group) => group.places.length > 0,
    );
  });

  /** Los sitios de los tipos que se enseñan, en el orden del recorrido */
  protected readonly shown = computed(() => {
    const hidden = this.hidden();
    return (this.piece().data?.places ?? []).filter((place) => !hidden.has(place.kind));
  });

  constructor() {
    effect(() => {
      const data = this.piece().data;
      const element = this.mapElement()?.nativeElement;
      if (data && element) void this.draw(element, data);
    });
    // El filtro solo quita o pone capas: no vuelve a pintar el mapa
    effect(() => this.applyFilter(this.hidden()));
    inject(DestroyRef).onDestroy(() => this.removeMap());
  }

  protected toggle(kind: AiPlaceKind): void {
    this.hidden.update((hidden) => {
      const next = new Set(hidden);
      if (!next.delete(kind)) next.add(kind);
      return next;
    });
  }

  /** Lleva el mapa al sitio de la tarjeta y abre su globo */
  protected focus(place: AiRoutePlace): void {
    const marker = this.markers.get(place.url);
    if (!this.map || !marker) return;
    this.map.flyTo(marker.getLatLng(), Math.max(this.map.getZoom(), 14), { duration: 0.6 });
    marker.openPopup();
    this.mapElement()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

  /** "Km 34 · Restaurante · a 0,4 km": por dónde cae y lo lejos que queda de la carretera */
  protected where(place: AiRoutePlace, data: AiRouteMap): string {
    const km = data.distanceKm !== null && data.line ? `Km ${Math.round(place.position * data.distanceKm)}` : null;
    const category = place.category ? (CATEGORIES[place.category] ?? null) : null;
    return [km, category, `a ${formatNumber(place.distanceKm)} km`].filter(Boolean).join(' · ');
  }

  private applyFilter(hidden: ReadonlySet<AiPlaceKind>): void {
    if (!this.map) return;
    for (const [kind, layer] of this.kindLayers) {
      if (hidden.has(kind)) layer.remove();
      else layer.addTo(this.map);
    }
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
        attribution: [
          `<a href="${data.sources.map.url}" target="_blank" rel="noopener">${data.sources.map.attribution}</a>`,
          `recorrido de <a href="${data.sources.route.url}" target="_blank" rel="noopener">${data.sources.route.name}</a>`,
          ...(data.sources.places ? [`sitios de <a href="${data.sources.places.url}" target="_blank" rel="noopener">${data.sources.places.name}</a>`] : []),
        ].join(' · '),
      }).addTo(this.map);
      this.layers = L.layerGroup().addTo(this.map);
      this.mapOn = element;
    }
    const map = this.map!;
    const layers = this.layers!;
    layers.clearLayers();
    for (const layer of this.kindLayers.values()) layer.remove();
    this.kindLayers.clear();
    this.markers.clear();

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

    // Los sitios, encima del recorrido: un pin redondo con el icono de su tipo
    const icons = new Map(
      KIND_ORDER.map((kind) => [
        kind,
        L.divIcon({
          className: '',
          html: `<span class="pin" style="--kind:${KINDS[kind].fill};width:28px;height:28px"><svg viewBox="0 0 256 256"><path d="${ICONS[KINDS[kind].icon]}"/></svg></span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -14],
        }),
      ]),
    );
    for (const place of data.places ?? []) {
      let layer = this.kindLayers.get(place.kind);
      if (!layer) this.kindLayers.set(place.kind, (layer = L.layerGroup()));
      const marker = L.marker([place.latitude, place.longitude], { icon: icons.get(place.kind), title: place.name ?? KINDS[place.kind].unnamed })
        .bindPopup(() => this.popup(place, data))
        .addTo(layer);
      this.markers.set(place.url, marker);
    }
    this.applyFilter(this.hidden());

    // El encuadre solo la primera vez: si luego llegan los sitios, no se mueve lo que se mira
    if (firstTime) {
      const points: Leaflet.LatLngExpression[] = data.line ?? [start, ...(data.places ?? []).map((p): Leaflet.LatLngTuple => [p.latitude, p.longitude])];
      if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [24, 24] });
      else map.setView(start, 13);
    }
  }

  // El globo de un sitio, hecho con nodos de texto (los nombres vienen de OpenStreetMap)
  private popup(place: AiRoutePlace, data: AiRouteMap): HTMLElement {
    const box = document.createElement('div');
    const line = (tag: string, value: string) => {
      const node = document.createElement(tag);
      node.textContent = value;
      box.append(node);
      return node;
    };
    line('strong', place.name ?? KINDS[place.kind].unnamed);
    line('span', [this.where(place, data), place.cuisine[0]].filter(Boolean).join(' · '));
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
    this.kindLayers.clear();
    this.markers.clear();
  }
}

// Leaflet es CommonJS: según cómo lo empaquete el build, llega como módulo o en default
async function loadLeaflet(): Promise<typeof Leaflet> {
  const module = (await import('leaflet')) as typeof Leaflet & { default?: typeof Leaflet };
  return module.default ?? module;
}
