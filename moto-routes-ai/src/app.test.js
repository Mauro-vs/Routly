import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { startApp, testConfig } from "./testing/helpers.js";

describe("app", () => {
  let server;
  before(async () => {
    server = await startApp();
  });
  after(() => server.close());

  it("GET /health dice si hay IA", async () => {
    const { status, body } = await server.request("/health");
    assert.equal(status, 200);
    assert.deepEqual(body, { ok: true, ai: true });

    const withoutKey = await startApp({ config: testConfig({ OPENROUTER_API_KEY: "" }) });
    assert.deepEqual((await withoutKey.request("/health")).body, { ok: true, ai: false });
    await withoutKey.close();
  });

  it("un endpoint que no existe responde 404 con el formato de la API", async () => {
    const { status, body } = await server.request("/ai/nada");
    assert.equal(status, 404);
    assert.deepEqual(body, { statusCode: 404, error: "Not Found", message: "Endpoint GET /ai/nada not found" });
  });

  it("un JSON mal formado es un 400", async () => {
    const { status, body } = await server.request("/ai/nada", { method: "POST", body: "{mal" });
    assert.equal(status, 400);
    assert.equal(body.message, "Malformed JSON in request body");
  });

  it("lleva las cabeceras de helmet y no dice que es Express", async () => {
    const { headers } = await server.request("/health");
    assert.equal(headers.get("x-frame-options"), "DENY");
    assert.equal(headers.get("x-powered-by"), null);
  });
});
