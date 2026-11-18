import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiApiService, AiError } from '../../../../core/ai/ai-api.service';
import { AiChatContextService } from '../../../../core/ai/ai-chat-context.service';
import { AiInsights, AiStops, AiWeather } from '../../../../core/ai/ai.models';
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

describe('AiInsightsComponent', () => {
  let api: jasmine.SpyObj<AiApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<AiApiService>('AiApiService', ['insights', 'weather', 'stops']);
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
    expect(text(element)).toContain('google/gemini-2.5-flash');
  });

  it('sin IA configurada (503) no salen los textos, pero sí el tiempo y las paradas', async () => {
    api.insights.and.rejectWith(new AiError('AI is not configured', 503));
    api.weather.and.resolveTo(WEATHER);
    api.stops.and.resolveTo(STOPS);
    const { element } = await render();

    expect(text(element)).toContain('no están disponibles');
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
});
