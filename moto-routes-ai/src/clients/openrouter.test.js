import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { completion } from "../testing/fixtures.js";
import { fakeFetch } from "../testing/helpers.js";
import { createOpenRouterClient, pickModels } from "./openrouter.js";

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
    const warn = console.warn;
    console.warn = () => {};
    try {
      const busy = client(() => ({ status: 429, body: {} }));
      await assert.rejects(busy.openRouter.complete({ messages: [] }), { status: 503 });
    } finally {
      console.warn = warn;
    }
  });

  it("un 200 con un error dentro también es un fallo", async () => {
    const { openRouter } = client(() => ({ body: { error: { code: 502, message: "Provider returned error" } } }));
    await assert.rejects(openRouter.complete({ messages: [] }), { status: 502 });
  });
});

const free = (id, { tools = true, context = 128_000 } = {}) => ({
  id,
  context_length: context,
  pricing: { prompt: "0", completion: "0" },
  supported_parameters: tools ? ["tools", "temperature"] : ["temperature"],
});

describe("pickModels", () => {
  const catalog = [
    free("meta-llama/llama-3.3-70b-instruct:free"),
    free("qwen/qwen3.7-plus:free", { context: 256_000 }),
    free("sin/herramientas:free", { tools: false, context: 1_000_000 }),
    free("openrouter/free", { context: 2_000_000 }),
    { id: "google/gemini-2.5-flash", context_length: 1_000_000, pricing: { prompt: "0.0000003", completion: "0.0000025" }, supported_parameters: ["tools"] },
  ];

  it("deja los que existen, en su orden", () => {
    assert.deepEqual(pickModels(["meta-llama/llama-3.3-70b-instruct:free"], catalog), ["meta-llama/llama-3.3-70b-instruct:free"]);
  });

  it("cambia los gratuitos retirados por otros gratuitos con herramientas, los de más contexto primero", () => {
    assert.deepEqual(pickModels(["qwen/qwen3-235b-a22b:free", "meta-llama/llama-3.3-70b-instruct:free"], catalog), [
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen3.7-plus:free",
    ]);
  });

  it("los de pago no se cambian por otros: solo se quitan los que no existen", () => {
    assert.deepEqual(pickModels(["google/gemini-2.5-flash", "x-ai/no-existe"], catalog), ["google/gemini-2.5-flash"]);
  });
});

describe("createOpenRouterClient con checkModels", () => {
  it("mira el catálogo una vez y manda solo los modelos que existen", async () => {
    const original = console.warn;
    console.warn = () => {};
    try {
      const fetch = fakeFetch({
        "GET openrouter.ai/api/v1/models": () => ({ body: { data: [free("meta-llama/llama-3.3-70b-instruct:free"), free("qwen/qwen3.7-plus:free")] } }),
        [OPENROUTER]: () => ({ body: completion("Hola", "qwen/qwen3.7-plus:free") }),
      });
      const openRouter = createOpenRouterClient({
        apiKey: "sk-or-test",
        baseUrl: "https://openrouter.ai/api/v1",
        models: ["qwen/qwen3-235b-a22b:free", "meta-llama/llama-3.3-70b-instruct:free"],
        timeoutMs: 1000,
        maxTokens: 500,
        siteUrl: "http://localhost:4300",
        checkModels: true,
        fetch,
      });
      await openRouter.complete({ messages: [{ role: "user", content: "Hola" }] });
      await openRouter.complete({ messages: [{ role: "user", content: "Otra" }] });

      assert.equal(fetch.calls.filter((call) => call.key === "GET openrouter.ai/api/v1/models").length, 1);
      const sent = JSON.parse(fetch.calls.at(-1).init.body);
      assert.deepEqual(sent.models, ["meta-llama/llama-3.3-70b-instruct:free", "qwen/qwen3.7-plus:free"]);
    } finally {
      console.warn = original;
    }
  });

  it("si no puede mirar el catálogo, usa AI_MODELS tal cual", async () => {
    const original = console.warn;
    console.warn = () => {};
    try {
      const { fetch, openRouter } = client(() => ({ body: completion("Hola") }), { checkModels: true });
      await openRouter.complete({ messages: [{ role: "user", content: "Hola" }] });
      assert.deepEqual(JSON.parse(fetch.calls.at(-1).init.body).models, ["google/gemini-2.5-flash", "x-ai/grok-4-fast"]);
    } finally {
      console.warn = original;
    }
  });
});

describe("createOpenRouterClient con otro proveedor (Groq, Gemini)", () => {
  const GROQ = "POST api.groq.com/openai/v1/chat/completions";
  const groq = (handler) => {
    const fetch = fakeFetch({ [GROQ]: handler });
    const ai = createOpenRouterClient({
      provider: "groq",
      label: "Groq",
      apiKey: "gsk_test",
      baseUrl: "https://api.groq.com/openai/v1",
      models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
      timeoutMs: 1000,
      maxTokens: 500,
      siteUrl: "http://localhost:4300",
      fetch,
    });
    return { fetch, ai };
  };

  it("manda un solo modelo, sin la lista de OpenRouter ni sus cabeceras", async () => {
    const { fetch, ai } = groq(() => ({ body: completion("Hola", "llama-3.3-70b-versatile") }));
    const answer = await ai.complete({ messages: [{ role: "user", content: "Hola" }] });

    assert.equal(answer.content, "Hola");
    const sent = JSON.parse(fetch.calls[0].init.body);
    assert.equal(sent.model, "llama-3.3-70b-versatile");
    assert.equal(sent.models, undefined);
    assert.equal(fetch.calls[0].init.headers["x-title"], undefined);
  });

  it("si el principal está saturado (429), prueba con el de reserva", async () => {
    const warn = console.warn;
    console.warn = () => {};
    try {
      const { fetch, ai } = groq((_url, init) =>
        JSON.parse(init.body).model === "llama-3.3-70b-versatile"
          ? { status: 429, body: { error: { message: "Rate limit reached" } } }
          : { body: completion("Hola", "llama-3.1-8b-instant") },
      );
      const answer = await ai.complete({ messages: [{ role: "user", content: "Hola" }] });

      assert.equal(answer.model, "llama-3.1-8b-instant");
      assert.equal(fetch.calls.length, 2);
    } finally {
      console.warn = warn;
    }
  });

  it("con la clave mal no prueba otro modelo: 502", async () => {
    const error = console.error;
    console.error = () => {};
    try {
      const { fetch, ai } = groq(() => ({ status: 401, body: { error: { message: "Invalid API Key" } } }));
      await assert.rejects(ai.complete({ messages: [] }), { status: 502, message: "Groq is not available right now" });
      assert.equal(fetch.calls.length, 1);
    } finally {
      console.error = error;
    }
  });
});
