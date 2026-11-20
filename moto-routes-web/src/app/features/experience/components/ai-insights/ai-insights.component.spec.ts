import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiApiService, AiError } from '../../../../core/ai/ai-api.service';
import { AiChatContextService } from '../../../../core/ai/ai-chat-context.service';
import { AiInsights, AiRouteMap, AiStops, AiWeather } from '../../../../core/ai/ai.models';
import { AiInsightsComponent } from './ai-insights.component';

const PLACE = { city: 'Palma', region: 'Illes Balears', latitude: 39.57, longitude: 2.65 };

const INSIGHTS: AiInsights = {
  summary: 'Una vuelta por las calas del sur de Mallorca.',
  highlights: ['Carreteras de costa'],
  idealFor: { level: 'Medio', rider: 'Quien ya hace curvas con soltura', bike: 'Trail media, carnet A' },
  packing: ['Bañador'],
  faq: [{ question: '¿Hay que llevar moto?', answer: 'No, va incluida.' }],
  model: 'google/gemini-2.5-flash',
  generatedAt: '2026-11-18T10:00:00.000Z',
  basedOn: { weather: true, stops: true },
};

const WEATHER: AiWeather = {
  place: PLACE,
  timezone: 'Europe/Madrid',
  departures: [
    {
      slug: 'salida-1',
      startAt: '2026-11-20T08:00:00.000Z',
      endAt: null,
      kind: 'forecast',
      days: [
        { date: '2026-11-20', code: 61, label: 'Lluvia débil', icon: 'rain', max: 17, min: 9, precipitation: 3, rainChance: 70, wind: 20, warnings: ['rain'] },
      ],
    },
  ],
};

const STOPS: AiStops = {
  start: {
    place: PLACE,
    food: [{ name: 'Can Joan', category: 'restaurant', cuisine: [], brand: null, openingHours: null, distanceKm: 0.4, url: 'https://www.openstreetmap.org/node/1' }],
    fuel: [],
    viewpoints: [],
  },
  end: null,
  source: { name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/copyright', attribution: '© OpenStreetMap' },
};

const ROUTE: AiRouteMap = {
  start: PLACE,
  end: { city: 'Sóller', region: 'Illes Balears', latitude: 39.77, longitude: 2.71 },
  waypoints: [{ name: 'Valldemossa', latitude: 39.71, longitude: 2.62 }],
  line: [[39.57, 2.65], [39.71, 2.62], [39.77, 2.71]],
  routed: true,
  distanceKm: 61.2,
  durationH: 1.1,
  places: [
    { kind: 'food', name: 'Ca\'n Pedro', category: 'restaurant', cuisine: ['regional'], openingHours: null, website: null, latitude: 39.71, longitude: 2.62, distanceKm: 0.3, position: 0.5, url: 'https://www.openstreetmap.org/node/9' },
    { kind: 'viewpoint', name: 'Mirador de Ses Puntes', category: null, cuisine: [], openingHours: null, website: null, latitude: 39.72, longitude: 2.63, distanceKm: 1.2, position: 0.6, url: 'https://www.openstreetmap.org/node/10' },
    { kind: 'viewpoint', name: null, category: null, cuisine: [], openingHours: null, website: null, latitude: 39.73, longitude: 2.64, distanceKm: 2.1, position: 0.7, url: 'https://www.openstreetmap.org/node/11' },
  ],
  placesStatus: 'ok',
  placesRadiusKm: { food: 1.5, viewpoint: 3, fuel: 2 },
  sources: {
    map: { name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/copyright', attribution: '© OpenStreetMap contributors' },
    route: { name: 'OSRM', url: 'https://project-osrm.org' },
  },
};

describe('AiInsightsComponent', () => {
  let api: jasmine.SpyObj<AiApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<AiApiService>('AiApiService', ['insights', 'weather', 'stops', 'routeMap']);
    api.routeMap.and.resolveTo(ROUTE);
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), { provide: AiApiService, useValue: api }] });
  });

  async function render(): Promise<{ fixture: ComponentFixture<AiInsightsComponent>; element: HTMLElement }> {
    const fixture = TestBed.createComponent(AiInsightsComponent);
    fixture.componentRef.setInput('slug', 'calas-de-mallorca');
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  const text = (element: Element | null): string => element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  it('enseña las cinco piezas: resumen, tiempo, paradas, qué llevar y preguntas', async () => {
    api.insights.and.resolveTo(INSIGHTS);
    api.weather.and.resolveTo(WEATHER);
    api.stops.and.resolveTo(STOPS);
    const { element } = await render();

    expect(api.insights).toHaveBeenCalledWith('calas-de-mallorca', jasmine.any(AbortSignal));
    expect(text(element)).toContain('Una vuelta por las calas del sur de Mallorca.');
    expect(text(element)).toContain('Quien ya hace curvas con soltura');
    expect(text(element)).toContain('Lluvia débil');
    expect(text(element)).toContain('Can Joan');
    expect(text(element)).toContain('Bañador');
    expect(text(element)).toContain('¿Hay que llevar moto?');
    expect(text(element)).toContain('Escrito con IA a partir de los datos de la ficha');
  });

  it('sin IA configurada (503) no salen los textos, pero sí el tiempo y las paradas', async () => {
    api.insights.and.rejectWith(new AiError('AI is not configured', 503));
    api.weather.and.resolveTo(WEATHER);
    api.stops.and.resolveTo(STOPS);
    const { element } = await render();

    // Sin aviso: la ficha sigue como si no hubiera IA
    expect(element.querySelector('#ia-resumen')).toBeNull();
    expect(element.querySelector('#ia-llevar')).toBeNull();
    expect(element.querySelector('#ia-preguntas')).toBeNull();
    expect(text(element)).toContain('Lluvia débil');
    expect(text(element)).toContain('Can Joan');
  });

  it('si falla la IA se puede reintentar', async () => {
    api.insights.and.rejectWith(new AiError('Bad gateway', 502));
    api.weather.and.resolveTo(WEATHER);
    api.stops.and.resolveTo(STOPS);
    const { fixture, element } = await render();

    api.insights.and.resolveTo(INSIGHTS);
    element.querySelector<HTMLButtonElement>('.ai > p .link')?.click();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();

    expect(api.insights).toHaveBeenCalledTimes(2);
    expect(text(element)).toContain('Una vuelta por las calas del sur de Mallorca.');
  });

  it('"Pregúntale al asistente" abre el chat con la pregunta elegida', async () => {
    api.insights.and.resolveTo(INSIGHTS);
    api.weather.and.resolveTo(WEATHER);
    api.stops.and.resolveTo(STOPS);
    const { element } = await render();
    const chat = TestBed.inject(AiChatContextService);

    element.querySelector<HTMLButtonElement>('.ask .chip')?.click();

    expect(chat.open()).toBeTrue();
    expect(chat.pendingQuestion()).toBe('¿Vale para alguien que lleva poco en moto?');
  });

  // Leaflet se carga aparte (import dinámico): se espera a que pinte el mapa
  async function untilMap(fixture: ComponentFixture<AiInsightsComponent>, element: HTMLElement): Promise<HTMLElement | null> {
    for (let i = 0; i < 40 && !element.querySelector('.leaflet-container'); i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      await fixture.whenStable();
    }
    return element.querySelector<HTMLElement>('.leaflet-container');
  }

  it('el mapa dibuja el recorrido por los puntos de paso, con dónde comer y miradores', async () => {
    api.insights.and.resolveTo(INSIGHTS);
    api.weather.and.resolveTo(WEATHER);
    api.stops.and.resolveTo(STOPS);
    const { fixture, element } = await render();

    expect(api.routeMap).toHaveBeenCalledWith('calas-de-mallorca', jasmine.any(AbortSignal));
    expect(text(element.querySelector('.trip'))).toBe('Palma → Valldemossa → Sóller · 61 km por carretera, unas 1,1 h sin paradas');
    // Un filtro por tipo, con cuántos hay; sin gasolineras, no sale ese filtro
    const chips = Array.from(element.querySelectorAll('.filters .chip'), (chip) => text(chip));
    expect(chips).toEqual(['Dónde comer1', 'Miradores2']);
    // Tarjetas en el orden del recorrido, con el km; un mirador sin nombre sale como «Mirador»
    const names = Array.from(element.querySelectorAll('.card .name'), (name) => text(name));
    expect(names).toEqual(["Ca'n Pedro", 'Mirador de Ses Puntes', 'Mirador']);
    expect(text(element.querySelector('.card .muted'))).toBe('Km 31 · Restaurante · a 0,3 km');

    const map = await untilMap(fixture, element);
    expect(map).not.toBeNull();
    // Un pin con icono por sitio, y el recorrido y sus puntos dibujados aparte
    expect(map!.querySelectorAll('.pin').length).toBe(3);
    expect(text(map!.querySelector('.leaflet-control-attribution'))).toContain('OSRM');
  });

  it('el filtro quita un tipo de sitio del mapa y de las tarjetas', async () => {
    api.insights.and.resolveTo(INSIGHTS);
    api.weather.and.resolveTo(WEATHER);
    api.stops.and.resolveTo(STOPS);
    const { fixture, element } = await render();
    const map = await untilMap(fixture, element);

    const viewpoints = element.querySelectorAll<HTMLButtonElement>('.filters .chip')[1];
    viewpoints.click();
    await fixture.whenStable();

    expect(viewpoints.getAttribute('aria-pressed')).toBe('false');
    expect(Array.from(element.querySelectorAll('.card .name'), (name) => text(name))).toEqual(["Ca'n Pedro"]);
    expect(map!.querySelectorAll('.pin').length).toBe(1);
  });

  it('mientras se buscan los sitios, el mapa sale igual y lo dice', async () => {
    api.insights.and.resolveTo(INSIGHTS);
    api.weather.and.resolveTo(WEATHER);
    api.stops.and.resolveTo(STOPS);
    api.routeMap.and.resolveTo({ ...ROUTE, places: null, placesStatus: 'loading' });
    const { element } = await render();

    expect(text(element)).toContain('Buscando dónde comer, miradores y gasolineras a lo largo del recorrido…');
    expect(element.querySelector('.map')).not.toBeNull();
    expect(element.querySelector('.cards')).toBeNull();
  });

  it('si OSRM no responde, avisa de que la línea va en recto', async () => {
    api.insights.and.resolveTo(INSIGHTS);
    api.weather.and.resolveTo(WEATHER);
    api.stops.and.resolveTo(STOPS);
    api.routeMap.and.resolveTo({ ...ROUTE, routed: false, distanceKm: null, durationH: null });
    const { element } = await render();

    expect(text(element.querySelector('.trip'))).toBe('Palma → Valldemossa → Sóller');
    expect(text(element)).toContain('la línea une los puntos en recto');
  });

  it('si el mapa falla, lo dice sin tapar lo demás', async () => {
    api.insights.and.resolveTo(INSIGHTS);
    api.weather.and.resolveTo(WEATHER);
    api.stops.and.resolveTo(STOPS);
    api.routeMap.and.rejectWith(new AiError('Bad gateway', 502));
    const { element } = await render();

    expect(text(element)).toContain('El mapa no está disponible ahora mismo.');
    expect(text(element)).toContain('Can Joan');
  });
});
