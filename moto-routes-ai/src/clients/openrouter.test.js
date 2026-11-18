import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { completion } from "../testing/fixtures.js";
import { fakeFetch } from "../testing/helpers.js";
import { createOpenRouterClient } from "./openrouter.js";

const OPENROUTER = "POST openrouter.ai/api/v1/chat/completions";

function client(handler, overrides = {}) {
  const fetch = fakeFetch({ [OPENROUTER]: handler });
  const openRouter = createOpenRouterClient({
    apiKey: "sk-or-test",
    baseUrl: "https://openrouter.ai/api/v1",
    models: ["google/gemini-2.5-flash", "x-ai/grok-4-fast"],
    timeoutMs: 1000,
    maxTokens: 500,
    siteUrl: "http://localhost:4300",
    fetch,
    ...overrides,
  });
  return { fetch, openRouter };
}

describe("createOpenRouterClient", () => {
  it("manda la clave, la atribución y la lista de modelos de reserva", async () => {
    const { fetch, openRouter } = client(() => ({ body: completion("Hola", "x-ai/grok-4-fast") }));
    const answer = await openRouter.complete({ messages: [{ role: "user", content: "Hola" }], responseFormat: { type: "json_object" } });

    assert.equal(answer.content, "Hola");
    // Ha respondido el de reserva: se dice cuál
    assert.equal(answer.model, "x-ai/grok-4-fast");
    const { init } = fetch.calls[0];
    assert.equal(init.headers.authorization, "Bearer sk-or-test");
    assert.equal(init.headers["x-title"], "Routly");
    const sent = JSON.parse(init.body);
    assert.equal(sent.model, "google/gemini-2.5-flash");
    assert.deepEqual(sent.models, ["google/gemini-2.5-flash", "x-ai/grok-4-fast"]);
    assert.equal(sent.max_tokens, 500);
    assert.deepEqual(sent.response_format, { type: "json_object" });
  });

  it("sin clave no llama a nadie: 503", async () => {
    const { fetch, openRouter } = client(() => ({ body: completion("x") }), { apiKey: null });
    assert.equal(openRouter.enabled, false);
    await assert.rejects(openRouter.complete({ messages: [] }), { status: 503 });
    assert.equal(fetch.calls.length, 0);
  });

  it("sin crédito o con la clave mal es un 502 (sin enseñar su mensaje); saturado, un 503", async () => {
    const original = console.error;
    console.error = () => {};
    try {
      const noCredit = client(() => ({ status: 402, body: { error: { message: "Insufficient credits" } } }));
      await assert.rejects(noCredit.openRouter.complete({ messages: [] }), { status: 502, message: "OpenRouter is not available right now" });
    } finally {
      console.error = original;
    }
    const busy = client(() => ({ status: 429, body: {} }));
    await assert.rejects(busy.openRouter.complete({ messages: [] }), { status: 503 });
  });

  it("un 200 con un error dentro también es un fallo", async () => {
    const { openRouter } = client(() => ({ body: { error: { code: 502, message: "Provider returned error" } } }));
    await assert.rejects(openRouter.complete({ messages: [] }), { status: 502 });
  });
});
