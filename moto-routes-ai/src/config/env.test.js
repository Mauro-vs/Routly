import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadConfig } from "./env.js";

describe("loadConfig", () => {
  it("sin nada en el entorno usa los valores de desarrollo y no tiene clave", () => {
    const config = loadConfig({});
    assert.equal(config.port, 3001);
    assert.equal(config.routlyApiUrl, "http://localhost:3000/api");
    assert.equal(config.ai.apiKey, null);
    // Por defecto, Groq con sus modelos gratuitos
    assert.equal(config.ai.provider, "groq");
    assert.deepEqual(config.ai.models, ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"]);
  });

  it("lee la lista de modelos y quita la barra final de las URL", () => {
    const config = loadConfig({ AI_MODELS: " a/b , c/d:free ,", ROUTLY_API_URL: "http://api.local/api/" });
    assert.deepEqual(config.ai.models, ["a/b", "c/d:free"]);
    assert.equal(config.routlyApiUrl, "http://api.local/api");
  });

  it("con AI_PROVIDER cambian la URL y los modelos por defecto; la clave va en AI_API_KEY", () => {
    const groq = loadConfig({ AI_PROVIDER: "groq", AI_API_KEY: "gsk_test" }).ai;
    assert.equal(groq.baseUrl, "https://api.groq.com/openai/v1");
    assert.deepEqual(groq.models, ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"]);
    assert.equal(groq.apiKey, "gsk_test");
    assert.equal(groq.label, "Groq");

    const gemini = loadConfig({ AI_PROVIDER: "gemini", AI_MODELS: "gemini-2.5-flash" }).ai;
    assert.equal(gemini.baseUrl, "https://generativelanguage.googleapis.com/v1beta/openai");
    assert.deepEqual(gemini.models, ["gemini-2.5-flash"]);
    // La clave de OpenRouter no vale para otro proveedor
    assert.equal(loadConfig({ AI_PROVIDER: "groq", OPENROUTER_API_KEY: "sk-or-x" }).ai.apiKey, null);
  });

  it("el resumen de opiniones puede tener sus propios modelos; sin ellos, los de AI_MODELS", () => {
    assert.equal(loadConfig({}).ai.reviewsModels, null);
    assert.deepEqual(loadConfig({ AI_MODELS_REVIEWS: "openai/gpt-oss-120b, x/y" }).ai.reviewsModels, ["openai/gpt-oss-120b", "x/y"]);
    assert.throws(() => loadConfig({ AI_MODELS_REVIEWS: "con espacios" }), /AI_MODELS_REVIEWS/);
  });

  it("una clave vacía cuenta como sin clave", () => {
    assert.equal(loadConfig({ AI_API_KEY: "   " }).ai.apiKey, null);
  });

  it("con un valor que no vale lanza un error que dice cuál", () => {
    assert.throws(() => loadConfig({ PORT: "abc" }), /PORT/);
    assert.throws(() => loadConfig({ AI_MODELS: "modelo con espacios" }), /AI_MODELS/);
    assert.throws(() => loadConfig({ AI_PROVIDER: "chatgpt" }), /AI_PROVIDER/);
    assert.throws(() => loadConfig({ ROUTLY_API_URL: "ftp://x" }), /ROUTLY_API_URL/);
  });
});
