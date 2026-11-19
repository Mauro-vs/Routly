import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { OPEN_METEO } from "../clients/weather.js";
import { EXTRAS_BUDGET_MS } from "../services/insights.service.js";
import { API, fakeFetch, startApp, testConfig } from "../testing/helpers.js";
import {
  NOW,
  archiveBody,
  completion,
  departures,
  experience,
  forecastBody,
  geocodingBody,
  insightsAnswer,
  photonBody,
} from "../testing/fixtures.js";

const OPENROUTER = "POST openrouter.ai/api/v1/chat/completions";
const PHOTON = "GET photon.komoot.io/reverse";
const host = (url) => new URL(url).host + new URL(url).pathname;

function handlers(overrides = {}) {
  return {
    [`GET ${API}/experiences/pirineo-en-moto`]: () => ({ body: { data: experience } }),
    [`GET ${API}/experiences/pirineo-en-moto/departures`]: () => ({ body: { data: departures } }),
    [`GET ${host(OPEN_METEO.forecast)}`]: () => ({ body: forecastBody() }),
    [`GET ${host(OPEN_METEO.archive)}`]: (url) => ({ body: archiveBody(url) }),
    [`GET ${host(OPEN_METEO.geocoding)}`]: () => ({ body: geocodingBody }),
    [PHOTON]: (url) => ({ body: photonBody(url) }),
    [OPENROUTER]: () => ({ body: completion(JSON.stringify(insightsAnswer)) }),
    ...overrides,
  };
}

describe("GET /ai/experiences/:slug/insights", () => {
  let server;
  afterEach(() => {
    mock.timers.reset();
    return server?.close();
  });

  async function start(overrides, config) {
    mock.timers.enable({ apis: ["Date"], now: NOW });
    const fetch = fakeFetch(handlers(overrides));
    server = await startApp({ fetch, config });
    return fetch;
  }
  const insights = () => server.request("/ai/experiences/pirineo-en-moto/insights");
  const aiCalls = (fetch) => fetch.calls.filter((call) => call.key === OPENROUTER);

  it("los textos de la IA, con el modelo que los ha escrito y en qué datos se basan", async () => {
    const fetch = await start();
    const { status, body } = await insights();

    assert.equal(status, 200);
    assert.equal(body.data.summary, insightsAnswer.summary);
    assert.equal(body.data.faq.length, 3);
    assert.equal(body.data.model, "google/gemini-2.5-flash");
    assert.equal(body.data.generatedAt, new Date(NOW).toISOString());
    assert.deepEqual(body.data.basedOn, { weather: true, stops: true });

    // A la IA le llegan los datos reales: la ruta, el tiempo (con su aviso) y las paradas
    const [system, user] = JSON.parse(aiCalls(fetch)[0].init.body).messages;
    assert.match(system.content, /SOLO los datos/);
    assert.match(user.content, /Valle de Tena/);
    assert.match(user.content, /"avisos":\["rain"\]/);
    assert.match(user.content, /Casa Fau/);
  });

  it("mil visitas, una llamada a la IA", async () => {
    const fetch = await start();
    await insights();
    await insights();
    assert.equal(aiCalls(fetch).length, 1);
  });

  it("ya escritos, salen de la caché sin esperar al tiempo ni a OpenStreetMap", async () => {
    let slow = false;
    const fetch = await start({ [PHOTON]: (url) => (slow ? new Promise(() => {}) : { body: photonBody(url) }) });
    await insights();
    slow = true;
    const before = fetch.calls.length;
    const started = performance.now();
    const { status } = await insights();
    assert.equal(status, 200);
    assert.ok(performance.now() - started < 500);
    // Solo la experiencia y sus salidas (en su caché de un minuto): nada fuera
    assert.equal(fetch.calls.length, before);
  });

  it("si la experiencia cambia, se vuelven a escribir", async () => {
    let description = "Primera versión";
    const fetch = await start({
      [`GET ${API}/experiences/pirineo-en-moto`]: () => ({ body: { data: { ...experience, description } } }),
    });
    await insights();
    description = "Segunda versión";
    // La experiencia se guarda un minuto: pasado, se vuelve a pedir a la API
    mock.timers.setTime(NOW + 61_000);
    await insights();
    assert.equal(aiCalls(fetch).length, 2);
  });

  it("si el tiempo falla, se escribe igual sin él", async () => {
    await start({ [`GET ${host(OPEN_METEO.forecast)}`]: () => ({ status: 500, body: {} }) });
    const { status, body } = await insights();
    assert.equal(status, 200);
    assert.deepEqual(body.data.basedOn, { weather: false, stops: true });
  });

  it("no espera a OpenStreetMap si tarda: escribe sin las paradas", async () => {
    // OpenStreetMap no contesta nunca: los textos salen igual, a los pocos segundos
    await start({ [PHOTON]: () => new Promise(() => {}) });
    const started = performance.now();
    const { status, body } = await insights();

    assert.equal(status, 200);
    assert.equal(body.data.basedOn.stops, false);
    assert.ok(performance.now() - started < EXTRAS_BUDGET_MS + 1500);
  });

  it("si la IA se pasa de largo, se recorta en vez de pedirlo otra vez", async () => {
    const long = {
      ...insightsAnswer,
      highlights: Array.from({ length: 9 }, (_, index) => `Punto ${index + 1}`),
      packing: [...insightsAnswer.packing, "x".repeat(300)],
    };
    const fetch = await start({ [OPENROUTER]: () => ({ body: completion(JSON.stringify(long)) }) });
    const { status, body } = await insights();

    assert.equal(status, 200);
    assert.equal(aiCalls(fetch).length, 1);
    assert.equal(body.data.highlights.length, 6);
    assert.ok(body.data.packing.every((item) => item.length <= 120));
  });

  it("no pide response_format (muchos modelos gratuitos no lo admiten)", async () => {
    const fetch = await start();
    await insights();
    assert.equal(JSON.parse(aiCalls(fetch)[0].init.body).response_format, undefined);
  });

  it("si la IA responde algo que no vale, lo pide otra vez", async () => {
    const answers = ["Aquí tienes: {no es json", "```json\n" + JSON.stringify(insightsAnswer) + "\n```"];
    const warn = console.warn;
    console.warn = () => {};
    try {
      const fetch = await start({ [OPENROUTER]: () => ({ body: completion(answers.shift()) }) });
      const { status } = await insights();
      assert.equal(status, 200);
      assert.equal(aiCalls(fetch).length, 2);
    } finally {
      console.warn = warn;
    }
  });

  it("si las dos veces responde mal, 502 y no se guarda", async () => {
    const warn = console.warn;
    console.warn = () => {};
    try {
      await start({ [OPENROUTER]: () => ({ body: completion(JSON.stringify({ summary: "solo esto" })) }) });
      const { status, body } = await insights();
      assert.equal(status, 502);
      assert.equal(body.message, "The AI returned an invalid answer, please try again later");
    } finally {
      console.warn = warn;
    }
  });

  it("sin clave de OpenRouter, 503", async () => {
    await start({}, testConfig({ OPENROUTER_API_KEY: "" }));
    const { status, body } = await insights();
    assert.equal(status, 503);
    assert.equal(body.message, "AI is not configured on this server");
  });
});
