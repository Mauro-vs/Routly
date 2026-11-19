import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { OPEN_METEO } from "../clients/weather.js";
import { API, fakeFetch, startApp } from "../testing/helpers.js";
import { NOW, archiveBody, departures, experience, forecastBody, geocodingBody, overpassBody } from "../testing/fixtures.js";

const host = (url) => new URL(url).host + new URL(url).pathname;

function handlers(overrides = {}) {
  return {
    [`GET ${API}/experiences/pirineo-en-moto`]: () => ({ body: { data: experience } }),
    [`GET ${API}/experiences/pirineo-en-moto/departures`]: () => ({ body: { data: departures } }),
    [`GET ${API}/experiences/no-existe`]: () => ({ status: 404, body: {} }),
    [`GET ${API}/experiences/no-existe/departures`]: () => ({ status: 404, body: {} }),
    [`GET ${host(OPEN_METEO.forecast)}`]: () => ({ body: forecastBody() }),
    [`GET ${host(OPEN_METEO.archive)}`]: (url) => ({ body: archiveBody(url) }),
    [`GET ${host(OPEN_METEO.geocoding)}`]: () => ({ body: geocodingBody }),
    "POST overpass-api.de/api/interpreter": () => ({ body: overpassBody }),
    ...overrides,
  };
}

describe("GET /ai/experiences/:slug/weather", () => {
  let server;
  afterEach(() => {
    mock.timers.reset();
    return server?.close();
  });

  async function start(overrides) {
    mock.timers.enable({ apis: ["Date"], now: NOW });
    const fetch = fakeFetch(handlers(overrides));
    server = await startApp({ fetch });
    return fetch;
  }

  it("la previsión de una salida cercana y la referencia del año pasado para una lejana", async () => {
    const fetch = await start();
    const { status, body } = await server.request("/ai/experiences/pirineo-en-moto/weather");

    assert.equal(status, 200);
    const { place, timezone, departures: [near, far] } = body.data;
    assert.equal(place.city, "Jaca");
    assert.equal(timezone, "Europe/Madrid");

    assert.equal(near.kind, "forecast");
    assert.deepEqual(near.days.map((day) => day.date), ["2026-06-04"]);
    assert.equal(near.days[0].label, "Lluvia");
    assert.deepEqual(near.days[0].warnings, ["rain"]);

    assert.equal(far.kind, "reference");
    assert.equal(far.referenceYear, 2025);
    // Del 1 al 2 de agosto (hora de Madrid), con las fechas de este año
    assert.deepEqual(far.days.map((day) => day.date), ["2026-08-01", "2026-08-02"]);
    assert.deepEqual(far.days[0].warnings, ["heat"]);
    const archive = fetch.calls.find((call) => call.key.includes("archive"));
    assert.equal(archive.url.searchParams.get("start_date"), "2025-08-01");

    // La previsión se pide con las coordenadas de la API, sin geocodificar
    assert.equal(fetch.calls.filter((call) => call.key.includes("geocoding")).length, 0);
    assert.equal(fetch.calls.find((call) => call.key.includes("forecast")).url.searchParams.get("latitude"), "42.57");
  });

  it("la segunda vez sale de la caché", async () => {
    const fetch = await start();
    await server.request("/ai/experiences/pirineo-en-moto/weather");
    const before = fetch.calls.length;
    await server.request("/ai/experiences/pirineo-en-moto/weather");
    assert.equal(fetch.calls.length, before);
  });

  it("una experiencia que no existe es un 404", async () => {
    await start();
    const { status, body } = await server.request("/ai/experiences/no-existe/weather");
    assert.equal(status, 404);
    assert.equal(body.message, "Experience not found");
  });

  it("un slug que no vale es un 400", async () => {
    await start();
    const { status, body } = await server.request("/ai/experiences/No%20Vale/weather");
    assert.equal(status, 400);
    assert.equal(body.details[0].field, "slug");
  });

  it("si Open-Meteo falla, 502", async () => {
    await start({ [`GET ${host(OPEN_METEO.forecast)}`]: () => ({ status: 500, body: {} }) });
    const { status, body } = await server.request("/ai/experiences/pirineo-en-moto/weather");
    assert.equal(status, 502);
    assert.equal(body.message, "Open-Meteo is not available right now");
  });
});

describe("GET /ai/experiences/:slug/stops", () => {
  let server;
  afterEach(() => server?.close());

  it("comida, gasolineras y miradores cerca de la salida y de la llegada", async () => {
    const fetch = fakeFetch(handlers());
    server = await startApp({ fetch });
    const { status, body } = await server.request("/ai/experiences/pirineo-en-moto/stops");

    assert.equal(status, 200);
    const { start, end, source } = body.data;
    assert.equal(start.place.city, "Jaca");
    assert.deepEqual(start.food.map((stop) => stop.name), ["Casa Fau"]);
    assert.deepEqual(start.food[0].cuisine, ["spanish", "local"]);
    assert.equal(start.food[0].url, "https://www.openstreetmap.org/node/1");
    // La gasolinera sin nombre toma la marca; la que no tiene ninguna, va detrás
    assert.deepEqual(start.fuel.map((stop) => stop.name), ["Repsol", null]);
    // El mirador con nombre primero, aunque esté más lejos
    assert.deepEqual(start.viewpoints.map((stop) => stop.name), ["Mirador de la Peña Oroel", null]);
    assert.ok(start.food[0].distanceKm < 1);

    // Sabiñánigo no tiene coordenadas en la API: se buscan, y gana la de España
    assert.equal(end.place.city, "Sabiñánigo");
    assert.equal(end.place.latitude, 42.52);
    assert.equal(source.attribution, "© OpenStreetMap contributors");

    const overpass = fetch.calls.filter((call) => call.key.startsWith("POST overpass"));
    assert.equal(overpass.length, 2);
    assert.match(overpass[0].init.headers["user-agent"], /Routly/);
  });

  it("en una ruta circular solo viene la salida", async () => {
    const circular = { ...experience, route: { ...experience.route, endLocation: experience.route.startLocation } };
    server = await startApp({
      fetch: fakeFetch(handlers({ [`GET ${API}/experiences/pirineo-en-moto`]: () => ({ body: { data: circular } }) })),
    });
    const { body } = await server.request("/ai/experiences/pirineo-en-moto/stops");
    assert.equal(body.data.end, null);
  });

  it("si el servidor principal de Overpass está saturado, se pregunta al de reserva", async () => {
    const original = console.warn;
    console.warn = () => {};
    try {
      server = await startApp({
        fetch: fakeFetch(
          handlers({
            "POST overpass-api.de/api/interpreter": () => ({ status: 429, body: {} }),
            "POST overpass.private.coffee/api/interpreter": () => ({ body: overpassBody }),
          }),
        ),
      });
      const { status, body } = await server.request("/ai/experiences/pirineo-en-moto/stops");
      assert.equal(status, 200);
      assert.ok(body.data.start.food.length > 0);
    } finally {
      console.warn = original;
    }
  });

  it("si los dos servidores de OpenStreetMap fallan, 502", async () => {
    const original = console.warn;
    console.warn = () => {};
    try {
      const busy = () => ({ status: 429, body: {} });
      const fetch = fakeFetch(
        handlers({
          "POST overpass-api.de/api/interpreter": busy,
          "POST overpass.private.coffee/api/interpreter": busy,
          "POST overpass.kumi.systems/api/interpreter": busy,
        }),
      );
      server = await startApp({ fetch });
      const { status, body } = await server.request("/ai/experiences/pirineo-en-moto/stops");
      assert.equal(status, 502);
      assert.equal(body.message, "OpenStreetMap is not available right now");

      // Durante un rato se da por caído: la siguiente falla enseguida, sin volver a preguntar
      const calls = fetch.calls.length;
      assert.equal((await server.request("/ai/experiences/pirineo-en-moto/stops")).status, 502);
      assert.equal(fetch.calls.filter((call) => call.key.includes("overpass")).length, fetch.calls.slice(0, calls).filter((call) => call.key.includes("overpass")).length);
    } finally {
      console.warn = original;
    }
  });
});
