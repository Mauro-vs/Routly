import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadConfig } from "./env.js";

describe("loadConfig", () => {
  it("sin nada en el entorno usa los valores de desarrollo y no tiene clave", () => {
    const config = loadConfig({});
    assert.equal(config.port, 3001);
    assert.equal(config.routlyApiUrl, "http://localhost:3000/api");
    assert.equal(config.ai.apiKey, null);
    assert.deepEqual(config.ai.models, [
      "meta-llama/llama-3.3-70b-instruct:free",
      "mistralai/mistral-small-3.2-24b-instruct:free",
      "qwen/qwen3-235b-a22b:free",
    ]);
  });

  it("lee la lista de modelos y quita la barra final de las URL", () => {
    const config = loadConfig({ AI_MODELS: " a/b , c/d:free ,", ROUTLY_API_URL: "http://api.local/api/" });
    assert.deepEqual(config.ai.models, ["a/b", "c/d:free"]);
    assert.equal(config.routlyApiUrl, "http://api.local/api");
  });

  it("una clave vacía cuenta como sin clave", () => {
    assert.equal(loadConfig({ OPENROUTER_API_KEY: "   " }).ai.apiKey, null);
  });

  it("con un valor que no vale lanza un error que dice cuál", () => {
    assert.throws(() => loadConfig({ PORT: "abc" }), /PORT/);
    assert.throws(() => loadConfig({ AI_MODELS: "gemini" }), /AI_MODELS/);
    assert.throws(() => loadConfig({ ROUTLY_API_URL: "ftp://x" }), /ROUTLY_API_URL/);
  });
});
