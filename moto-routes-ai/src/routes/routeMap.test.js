import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { OPEN_METEO } from "../clients/weather.js";
import { PLACES_BUDGET_MS } from "../services/routeMap.service.js";
import { API, fakeFetch, startApp } from "../testing/helpers.js";
import { experience, geocodingBody, jaca, overpassBody, photonBody } from "../testing/fixtures.js";

const OVERPASS = "POST overpass-api.de/api/interpreter";
const PHOTON = "GET photon.komoot.io/reverse";
const host = (url) => new URL(url).host + new URL(url).pathname;

// La ruta del recorrido: Jaca → Biescas (punto de paso) → Sabiñánigo
const withWaypoints = {
  ...experience,
  route: { ...experience.route, waypoints: [{ name: "Biescas", latitude: 42.63, longitude: -0.32 }] },
};

const osrmBody = {
  code: "Ok",
  routes: [
    {
      distance: 61234,
      duration: 3900,
      geometry: { type: "LineString", coordinates: [[-0.55, 42.57], [-0.4, 42.6], [-0.32, 42.63], [-0.36, 42.52]] },
    },
  ],
};

function handlers(data = withWaypoints, overrides = {}) {
  return {
    [`GET ${API}/experiences/pirineo-en-moto`]: () => ({ body: { data } }),
    [`GET ${host(OPEN_METEO.geocoding)}`]: () => ({ body: geocodingBody }),
    [PHOTON]: (url) => ({ body: photonBody(url) }),
    [OVERPASS]: () => ({ body: overpassBody }),
    ...overrides,
  };
}

// El fake busca por host+ruta exacta; OSRM lleva las coordenadas en la ruta, así que se envuelve
function withOsrm(fetch, answer = () => ({ body: osrmBody })) {
  const wrapped = async (input, init) => {
    const url = new URL(String(input));
    if (url.host === "router.project-osrm.org") {
      wrapped.osrm.push(url);
      const result = await answer(url);
      return new Response(JSON.stringify(result.body ?? null), { status: result.status ?? 200 });
    }
    return fetch(input, init);
  };
  wrapped.osrm = [];
  wrapped.calls = fetch.calls;
  return wrapped;
}

describe("GET /ai/experiences/:slug/route", () => {
  let server;
  afterEach(() => server?.close());

  async function start({ data, overrides, osrm } = {}) {
    const fetch = withOsrm(fakeFetch(handlers(data, overrides)), osrm);
    server = await startApp({ fetch });
    return fetch;
  }

  it("el recorrido por carretera pasa por los puntos de paso, con dónde comer, miradores y gasolineras", async () => {
    const fetch = await start();
    const { status, body } = await server.request("/ai/experiences/pirineo-en-moto/route");

    assert.equal(status, 200);
    const map = body.data;
    // Salida (coordenadas de la API), punto de paso y llegada (geocodificada), en ese orden
    assert.equal(fetch.osrm[0].pathname, "/route/v1/driving/-0.55,42.57;-0.32,42.63;-0.36,42.52");
    assert.equal(fetch.osrm[0].searchParams.get("geometries"), "geojson");
    assert.deepEqual(map.line[0], [42.57, -0.55]);
    assert.equal(map.line.length, 4);
    assert.equal(map.routed, true);
    assert.equal(map.distanceKm, 61.2);
    assert.equal(map.durationH, 1.1);
    assert.deepEqual(map.waypoints, [{ name: "Biescas", latitude: 42.63, longitude: -0.32 }]);
    assert.equal(map.start.city, "Jaca");
    assert.equal(map.end.city, "Sabiñánigo");

    // En el orden del recorrido; sin el restaurante sin nombre ni el bar (no se ha pedido)
    assert.equal(map.placesStatus, "ok");
    assert.deepEqual(
      map.places.map((place) => `${place.kind}:${place.name}`),
      ["food:Casa Fau", "fuel:Repsol", "food:Café Pirineo", "viewpoint:Mirador de la Peña Oroel"],
    );
    assert.equal(map.places[0].url, "https://www.openstreetmap.org/node/11");
    assert.equal(map.places[2].url, "https://www.openstreetmap.org/way/12");
    assert.deepEqual(map.placesRadiusKm, { food: 1.5, viewpoint: 3, fuel: 2 });

    // Photon se pregunta en puntos del recorrido separados (aquí 3), por cada tipo; Overpass, no
    const photon = fetch.calls.filter((call) => call.key === PHOTON);
    assert.equal(photon.length, 9);
    assert.deepEqual(photon[0].url.searchParams.getAll("osm_tag"), ["amenity:restaurant", "amenity:cafe"]);
    assert.equal(fetch.calls.filter((call) => call.key === OVERPASS).length, 0);
  });

  it("si Photon falla, busca en Overpass a lo largo de la línea", async () => {
    const original = console.warn;
    console.warn = () => {};
    try {
      const fetch = await start({ overrides: { [PHOTON]: () => ({ status: 503, body: {} }) } });
      const { body } = await server.request("/ai/experiences/pirineo-en-moto/route");
      assert.equal(body.data.placesStatus, "ok");
      assert.ok(body.data.places.some((place) => place.name === "Casa Fau"));
      assert.ok(body.data.places.some((place) => place.kind === "fuel"));
      const query = new URLSearchParams(fetch.calls.find((call) => call.key === OVERPASS).init.body).get("data");
      assert.match(query, /around:1500,42\.57,-0\.55,42\.6,-0\.4,/);
      assert.match(query, /tourism"="viewpoint/);
    } finally {
      console.warn = original;
    }
  });

  it("el recorrido y los sitios se guardan: la segunda vez no sale fuera", async () => {
    const fetch = await start();
    await server.request("/ai/experiences/pirineo-en-moto/route");
    const photon = fetch.calls.filter((call) => call.key === PHOTON).length;
    await server.request("/ai/experiences/pirineo-en-moto/route");
    assert.equal(fetch.osrm.length, 1);
    assert.equal(fetch.calls.filter((call) => call.key === PHOTON).length, photon);
  });

  it("si OSRM falla, une los puntos en recto y no lo guarda", async () => {
    const original = console.warn;
    console.warn = () => {};
    try {
      const fetch = await start({ osrm: () => ({ status: 503, body: { code: "Error" } }) });
      const { body } = await server.request("/ai/experiences/pirineo-en-moto/route");
      assert.equal(body.data.routed, false);
      assert.deepEqual(body.data.line, [[42.57, -0.55], [42.63, -0.32], [42.52, -0.36]]);
      assert.equal(body.data.distanceKm, null);

      await server.request("/ai/experiences/pirineo-en-moto/route");
      assert.equal(fetch.osrm.length, 2);
    } finally {
      console.warn = original;
    }
  });

  it("si no responde ningún OpenStreetMap, el mapa sale sin sitios", async () => {
    const original = console.warn;
    console.warn = () => {};
    try {
      const busy = () => ({ status: 504, body: {} });
      await start({
        overrides: {
          [PHOTON]: busy,
          [OVERPASS]: busy,
          "POST overpass.private.coffee/api/interpreter": busy,
          "POST overpass.kumi.systems/api/interpreter": busy,
        },
      });
      const { status, body } = await server.request("/ai/experiences/pirineo-en-moto/route");
      assert.equal(status, 200);
      assert.equal(body.data.places, null);
      assert.equal(body.data.placesStatus, "unavailable");
      assert.equal(body.data.line.length, 4);
    } finally {
      console.warn = original;
    }
  });

  it("si OpenStreetMap tarda, sale el recorrido ya y los sitios en la siguiente petición", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let release;
    const slow = new Promise((resolve) => (release = resolve));
    await start({ overrides: { [PHOTON]: (url) => slow.then(() => ({ body: photonBody(url) })) } });

    const first = server.request("/ai/experiences/pirineo-en-moto/route");
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    for (let i = 0; i < 20; i++) {
      t.mock.timers.tick(PLACES_BUDGET_MS / 10);
      await new Promise((resolve) => setImmediate(resolve));
    }
    const { body } = await first;
    assert.equal(body.data.placesStatus, "loading");
    assert.equal(body.data.line.length, 4);

    release();
    for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
    const again = await server.request("/ai/experiences/pirineo-en-moto/route");
    assert.equal(again.body.data.placesStatus, "ok");
  });

  it("una ruta circular sin puntos de paso no tiene recorrido: solo la salida y lo de alrededor", async () => {
    const circular = { ...experience, route: { ...experience.route, endLocation: jaca } };
    const fetch = await start({ data: circular });
    const { body } = await server.request("/ai/experiences/pirineo-en-moto/route");
    assert.equal(body.data.line, null);
    assert.equal(body.data.end, null);
    assert.equal(fetch.osrm.length, 0);
    // Alrededor de Jaca, a la distancia de cada tipo
    assert.deepEqual(body.data.places.map((place) => place.name).sort(), ["Casa Fau", "Repsol"]);
  });

  it("una ruta circular con puntos de paso vuelve a la salida", async () => {
    const circular = { ...withWaypoints, route: { ...withWaypoints.route, endLocation: jaca } };
    const fetch = await start({ data: circular });
    const { body } = await server.request("/ai/experiences/pirineo-en-moto/route");
    assert.equal(fetch.osrm[0].pathname, "/route/v1/driving/-0.55,42.57;-0.32,42.63;-0.55,42.57");
    assert.equal(body.data.end, null);
    assert.equal(body.data.routed, true);
  });

  it("una experiencia que no existe da 404", async () => {
    await start({ overrides: { [`GET ${API}/experiences/no-existe`]: () => ({ status: 404, body: {} }) } });
    const { status } = await server.request("/ai/experiences/no-existe/route");
    assert.equal(status, 404);
  });
});
