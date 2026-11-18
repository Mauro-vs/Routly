import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCache } from "./cache.js";

describe("createCache", () => {
  it("guarda lo calculado hasta que caduca", async () => {
    let time = 0;
    let loads = 0;
    const cache = createCache({ ttlMs: 1000, now: () => time });
    const load = async () => ++loads;

    assert.equal(await cache.wrap("a", load), 1);
    time = 999;
    assert.equal(await cache.wrap("a", load), 1);
    time = 1000;
    assert.equal(await cache.wrap("a", load), 2);
  });

  it("dos peticiones a la vez calculan una sola vez", async () => {
    let loads = 0;
    const cache = createCache({ ttlMs: 1000 });
    const load = () => new Promise((resolve) => setTimeout(() => resolve(++loads), 10));

    const [first, second] = await Promise.all([cache.wrap("a", load), cache.wrap("a", load)]);
    assert.equal(first, 1);
    assert.equal(second, 1);
    assert.equal(loads, 1);
  });

  it("un fallo no se guarda", async () => {
    const cache = createCache({ ttlMs: 1000 });
    await assert.rejects(cache.wrap("a", async () => { throw new Error("boom"); }), /boom/);
    assert.equal(await cache.wrap("a", async () => "ok"), "ok");
  });

  it("con más de max entradas borra la más antigua", () => {
    const cache = createCache({ ttlMs: 1000, max: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    assert.equal(cache.get("a"), undefined);
    assert.equal(cache.get("c"), 3);
    assert.equal(cache.size, 2);
  });
});
