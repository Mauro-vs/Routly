import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { API, fakeFetch } from "../testing/helpers.js";
import { createRoutlyClient } from "./routly.js";

const client = (handlers) => {
  const fetch = fakeFetch(handlers);
  return { fetch, routly: createRoutlyClient({ baseUrl: "http://localhost:3000/api", fetch, timeoutMs: 1000 }) };
};

describe("createRoutlyClient", () => {
  it("solo pide la tienda pública y devuelve su data", async () => {
    const { fetch, routly } = client({
      [`GET ${API}/experiences/costa-brava`]: () => ({ body: { data: { slug: "costa-brava" } } }),
    });
    assert.deepEqual(await routly.experience("costa-brava"), { slug: "costa-brava" });
    assert.equal(fetch.calls[0].url.pathname, "/api/shop/experiences/costa-brava");
  });

  it("manda los filtros con valor y se salta los vacíos", async () => {
    const { fetch, routly } = client({
      [`GET ${API}/experiences`]: () => ({ body: { data: [], pagination: { total: 0 } } }),
    });
    await routly.experiences({ search: "pirineo", difficulty: "easy", location: "", page: undefined });
    assert.deepEqual(Object.fromEntries(fetch.calls[0].url.searchParams), { search: "pirineo", difficulty: "easy" });
  });

  it("un 404 de la API es un 404 de la experiencia", async () => {
    const { routly } = client({
      [`GET ${API}/experiences/no-existe`]: () => ({ status: 404, body: { message: "Experience not found" } }),
    });
    await assert.rejects(routly.experience("no-existe"), { status: 404, message: "Experience not found" });
  });

  it("la API caída es un 502, y sin respuesta a tiempo un 504", async () => {
    const { routly } = client({});
    await assert.rejects(routly.experience("caida"), { status: 502, service: "Routly API" });
    const slow = createRoutlyClient({
      baseUrl: "http://localhost:3000/api",
      timeoutMs: 100,
      fetch: (url, { signal }) =>
        new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason))),
    });
    // El temporizador de AbortSignal.timeout no mantiene vivo el proceso: este sí
    const keepAlive = setTimeout(() => {}, 1000);
    await assert.rejects(slow.experience("lenta"), { status: 504 });
    clearTimeout(keepAlive);
  });

  it("un 500 de la API es un 502", async () => {
    const { routly } = client({ [`GET ${API}/categories`]: () => ({ status: 500, body: {} }) });
    await assert.rejects(routly.categories(), { status: 502 });
  });
});
