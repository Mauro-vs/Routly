import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ApiService, StreamError, readEvents } from './api.service';
import { isAbortError } from './api-error';

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

async function collect(body: ReadableStream<Uint8Array>): Promise<unknown[]> {
  const events: unknown[] = [];
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

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET con los parámetros que tienen valor y devuelve el cuerpo', async () => {
    const result = api.get<{ data: string[] }>('/api/shop/experiences', {
      category: 'montana-1a2b3c',
      search: '',
      host: undefined,
      page: 2,
    });

    const request = http.expectOne((req) => req.url === '/api/shop/experiences');
    expect(request.request.params.keys().sort()).toEqual(['category', 'page']);
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ data: ['a'] });

    expect(await result).toEqual({ data: ['a'] });
  });

  it('un fallo llega tal cual (HttpErrorResponse): lo traduce el store', async () => {
    const result = api.get('/api/shop/experiences/no-existe');
    http.expectOne('/api/shop/experiences/no-existe').flush(null, { status: 404, statusText: 'Not Found' });

    const error = await result.catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(404);
  });

  it('al abortar cancela la petición y rechaza con un AbortError', async () => {
    const controller = new AbortController();
    const result = api.get('/api/shop/experiences', {}, { signal: controller.signal });
    const request = http.expectOne('/api/shop/experiences');

    controller.abort();

    expect(request.cancelled).toBeTrue();
    expect(isAbortError(await result.catch((reason: unknown) => reason))).toBeTrue();
  });

  it('con una señal ya abortada no llega a pedir nada', async () => {
    const controller = new AbortController();
    controller.abort();

    const error = await api.get('/api/shop/experiences', {}, { signal: controller.signal }).catch((reason: unknown) => reason);

    http.expectNone('/api/shop/experiences');
    expect(isAbortError(error)).toBeTrue();
  });

  it('POST, PATCH y DELETE mandan el cuerpo y devuelven la respuesta', async () => {
    const created = api.post('/api/reviews', { rating: 5 });
    const createRequest = http.expectOne('/api/reviews');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual({ rating: 5 });
    createRequest.flush({ _id: 'r1' });
    expect(await created).toEqual({ _id: 'r1' });

    const updated = api.patch('/api/reviews/r1', { rating: 4 });
    http.expectOne((req) => req.method === 'PATCH' && req.url === '/api/reviews/r1').flush({ _id: 'r1' });
    await updated;

    const removed = api.delete('/api/reviews/r1/photos/p1');
    http.expectOne((req) => req.method === 'DELETE' && req.url === '/api/reviews/r1/photos/p1').flush({ _id: 'r1' });
    await removed;
  });

  it('stream manda el cuerpo y va pasando los eventos', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(
      new Response(streamOf(['event: delta\ndata: {"text":"Hola"}\n\nevent: done\ndata: {"model":"m"}\n\n']), {
        headers: { 'content-type': 'text/event-stream' },
      }),
    );
    const events: { event: string }[] = [];
    await api.stream<{ event: string }>('/ai/chat', { messages: [] }, (event) => events.push(event));

    const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
    expect(url).toBe('/ai/chat');
    expect(JSON.parse(init.body as string)).toEqual({ messages: [] });
    expect(events.map((event) => event.event)).toEqual(['delta', 'done']);
  });

  it('stream que no puede empezar: StreamError con el status (0 sin red)', async () => {
    spyOn(window, 'fetch').and.returnValues(
      Promise.resolve(new Response('{}', { status: 429 })),
      Promise.reject(new TypeError('Failed to fetch')),
    );
    const busy = await api.stream('/ai/chat', {}, () => undefined).catch((caught: unknown) => caught);
    expect(busy).toBeInstanceOf(StreamError);
    expect((busy as StreamError).status).toBe(429);

    const offline = await api.stream('/ai/chat', {}, () => undefined).catch((caught: unknown) => caught);
    expect((offline as StreamError).status).toBe(0);
  });
});
