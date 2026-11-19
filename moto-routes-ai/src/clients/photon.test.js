import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fakeFetch } from "../testing/helpers.js";
import { photonBody } from "../testing/fixtures.js";
import { DOWN_FOR_MS, createPhotonClient } from "./photon.js";

const PHOTON = "GET photon.komoot.io/reverse";
const JACA = { latitude: 42.57, longitude: -0.55 };
const FOOD = { tags: ["amenity:restaurant"], radiusKm: 2, limit: 80 };

function client(answer) {
  let time = 0;
  const fetch = fakeFetch({ [PHOTON]: answer });
  const photon = createPhotonClient({ fetch, timeoutMs: 1000, now: () => time });
  return { fetch, photon, later: (ms) => (time += ms) };
}

describe("createPhotonClient", () => {
  it("los sitios con la forma de Overpass, y como mucho 50 por consulta", async () => {
    const { fetch, photon } = client((url) => ({ body: photonBody(url) }));
    const places = await photon.near(JACA, FOOD);
    assert.deepEqual(places[0], { type: "node", id: 11, lat: 42.571, lon: -0.551, tags: { amenity: "restaurant", name: "Casa Fau" } });
    assert.equal(fetch.calls[0].url.searchParams.get("limit"), "50");
  });

  it("si está saturado (429), no se le vuelve a preguntar en un rato", async () => {
    let busy = true;
    const { fetch, photon, later } = client((url) => (busy ? { status: 429, body: {} } : { body: photonBody(url) }));
    await assert.rejects(photon.near(JACA, FOOD), { status: 502 });
    busy = false;
    await assert.rejects(photon.near(JACA, FOOD), { status: 502 });
    assert.equal(fetch.calls.length, 1);

    later(DOWN_FOR_MS);
    assert.equal((await photon.near(JACA, FOOD)).length, 2);
    assert.equal(fetch.calls.length, 2);
  });

  it("si no responde, tampoco", async () => {
    const { fetch, photon } = client(() => {
      throw new TypeError("fetch failed");
    });
    await assert.rejects(photon.near(JACA, FOOD));
    await assert.rejects(photon.near(JACA, FOOD));
    assert.equal(fetch.calls.length, 1);
  });

  it("un 400 es de esa consulta: no lo da por caído", async () => {
    const { fetch, photon } = client(() => ({ status: 400, body: {} }));
    await assert.rejects(photon.near(JACA, FOOD));
    await assert.rejects(photon.near(JACA, FOOD));
    assert.equal(fetch.calls.length, 2);
  });
});
