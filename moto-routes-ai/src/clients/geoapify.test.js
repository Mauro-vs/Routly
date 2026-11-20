import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fakeFetch } from "../testing/helpers.js";
import { geoapifyBody } from "../testing/fixtures.js";
import { DOWN_FOR_MS, createGeoapifyClient } from "./geoapify.js";

const GEOAPIFY = "GET api.geoapify.com/v2/places";
const JACA = { latitude: 42.57, longitude: -0.55 };
const ALL = { tags: ["amenity:restaurant", "tourism:viewpoint", "amenity:fuel"], radiusKm: 6, limit: 30 };

function client(answer, apiKey = "geo-test") {
  let time = 0;
  const fetch = fakeFetch({ [GEOAPIFY]: answer });
  const geoapify = createGeoapifyClient({ fetch, timeoutMs: 1000, apiKey, now: () => time });
  return { fetch, geoapify, later: (ms) => (time += ms) };
}

describe("createGeoapifyClient", () => {
  it("pide las categorías en un círculo y devuelve los sitios con sus etiquetas de OpenStreetMap", async () => {
    const { fetch, geoapify } = client((url) => ({ body: geoapifyBody(url) }));
    const places = await geoapify.near(JACA, ALL);

    const url = fetch.calls[0].url;
    assert.equal(url.searchParams.get("categories"), "catering.restaurant,tourism.attraction.viewpoint,service.vehicle.fuel");
    assert.equal(url.searchParams.get("filter"), "circle:-0.55,42.57,6000");
    assert.equal(url.searchParams.get("apiKey"), "geo-test");
    assert.deepEqual(places[0], {
      type: "node",
      id: 21,
      lat: 42.571,
      lon: -0.551,
      tags: { osm_type: "n", osm_id: 21, name: "Casa Fau", amenity: "restaurant", cuisine: "regional", opening_hours: "Mo-Su 13:00-16:00" },
    });
    assert.deepEqual(places[1].tags.tourism, "viewpoint");
    assert.equal(places[1].type, "way");
    assert.equal(places[2].tags.amenity, "fuel");
  });

  it("sin clave no pregunta", async () => {
    const { fetch, geoapify } = client(() => ({ body: {} }), null);
    assert.equal(geoapify.enabled, false);
    await assert.rejects(geoapify.near(JACA, ALL));
    assert.equal(fetch.calls.length, 0);
  });

  it("si se acaba la cuota (429), no se le vuelve a preguntar en un rato", async () => {
    const { fetch, geoapify, later } = client(() => ({ status: 429, body: {} }));
    await assert.rejects(geoapify.near(JACA, ALL), { status: 502 });
    await assert.rejects(geoapify.near(JACA, ALL));
    assert.equal(fetch.calls.length, 1);
    later(DOWN_FOR_MS);
    await assert.rejects(geoapify.near(JACA, ALL));
    assert.equal(fetch.calls.length, 2);
  });
});
