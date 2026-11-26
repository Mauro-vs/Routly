import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AiApiService, AiError, readEvents } from './ai-api.service';
import { ChatEvent } from './ai.models';

/** Un cuerpo de streaming que llega en estos trozos */
function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(body: ReadableStream<Uint8Array>): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  for await (const event of readEvents(body)) events.push(event);
  return events;
}

describe('readEvents', () => {
  it('lee los eventos aunque lleguen partidos entre trozos', async () => {
    const events = await collect(
      streamOf([
        'event: tool\ndata: {"name":"ver_salidas","label":"Mirando las salidas"}\n\nevent: del',
        'ta\ndata: {"text":"Hola"}\n',
        '\nevent: done\ndata: {"model":"m"}\n\n',
      ]),
    );
    expect(events).toEqual([
      { event: 'tool', data: { name: 'ver_salidas', label: 'Mirando las salidas' } },
      { event: 'delta', data: { text: 'Hola' } },
      { event: 'done', data: { model: 'm' } },
    ]);
  });

  it('ignora los bloques sin datos o que no son JSON', async () => {
    const events = await collect(streamOf([': ping\n\nevent: delta\ndata: no-json\n\nevent: delta\ndata: {"text":"ok"}\n\n']));
    expect(events).toEqual([{ event: 'delta', data: { text: 'ok' } }]);
  });
});

describe('AiApiService', () => {
  let api: AiApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AiApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide el bloque de IA a /ai y devuelve los datos', async () => {
    const promise = api.insights('calas-de-mallorca');
    http.expectOne('/ai/experiences/calas-de-mallorca/insights').flush({ data: { summary: 'Resumen' } });
    expect((await promise).summary).toBe('Resumen');
  });

  it('el resumen de opiniones, de una experiencia o de un guía (null si hay pocas)', async () => {
    const experience = api.reviewsSummary('experience', 'calas-de-mallorca');
    http.expectOne('/ai/experiences/calas-de-mallorca/reviews-summary').flush({ data: { summary: 'Gusta mucho' } });
    expect((await experience)?.summary).toBe('Gusta mucho');

    const host = api.reviewsSummary('host', 'lucia-ferrer-1');
    http.expectOne('/ai/hosts/lucia-ferrer-1/reviews-summary').flush({ data: null });
    expect(await host).toBeNull();
  });

  it('un 503 es "IA no disponible"', async () => {
    const promise = api.weather('calas-de-mallorca');
    http
      .expectOne('/ai/experiences/calas-de-mallorca/weather')
      .flush({ error: { message: 'AI is not configured' } }, { status: 503, statusText: 'Service Unavailable' });
    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).unavailable).toBeTrue();
  });

  it('el chat manda la conversación y va pasando los eventos', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(
      new Response(streamOf(['event: delta\ndata: {"text":"Hola"}\n\nevent: done\ndata: {"model":"m"}\n\n']), {
        headers: { 'content-type': 'text/event-stream' },
      }),
    );
    const events: ChatEvent[] = [];
    await api.chat({ messages: [{ role: 'user', content: 'Hola' }], experienceSlug: 'calas' }, (event) => events.push(event));

    const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
    expect(url).toBe('/ai/chat');
    expect(JSON.parse(init.body as string)).toEqual({ messages: [{ role: 'user', content: 'Hola' }], experienceSlug: 'calas' });
    expect(events.map((event) => event.event)).toEqual(['delta', 'done']);
  });

  it('el chat explica en español si hay demasiadas preguntas (429)', async () => {
    spyOn(window, 'fetch').and.resolveTo(new Response('{}', { status: 429 }));
    const error = await api.chat({ messages: [{ role: 'user', content: 'Hola' }] }, () => undefined).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).message).toContain('muchas preguntas');
  });

  it('el chat sin red dice que no ha podido conectar', async () => {
    spyOn(window, 'fetch').and.rejectWith(new TypeError('Failed to fetch'));
    const error = await api.chat({ messages: [{ role: 'user', content: 'Hola' }] }, () => undefined).catch((caught: unknown) => caught);
    expect((error as AiError).message).toContain('conectar');
  });
});
