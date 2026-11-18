import { createApp } from "../app.js";
import { loadConfig } from "../config/env.js";

process.env.NODE_ENV ??= "test";

/** La configuración de los tests: la de por defecto, con clave de OpenRouter salvo que se diga. */
export function testConfig(overrides = {}) {
  return loadConfig({ NODE_ENV: "test", OPENROUTER_API_KEY: "sk-or-test", ...overrides });
}

/**
 * Un fetch falso: cada petición se busca en handlers por "MÉTODO host+ruta" (sin la query), y si
 * no hay ninguno, falla como si no hubiera red. Cada handler recibe la URL y las opciones y
 * devuelve { status?, body } o una Response. Guarda las peticiones en fake.calls.
 */
export function fakeFetch(handlers = {}) {
  const calls = [];
  const fake = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = (init.method ?? "GET").toUpperCase();
    const key = `${method} ${url.host}${url.pathname}`;
    calls.push({ key, url, init });
    const handler = handlers[key];
    if (!handler) throw new TypeError(`fetch failed (no fake handler for ${key})`);
    const result = await handler(url, init);
    if (result instanceof Response) return result;
    return new Response(JSON.stringify(result.body ?? null), {
      status: result.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  };
  fake.calls = calls;
  return fake;
}

/** Arranca la app en un puerto libre. Devuelve request(path, init) → { status, body } y close(). */
export async function startApp({ config = testConfig(), fetch } = {}) {
  const app = createApp({ config, fetch });
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    app,
    base,
    async request(path, init = {}) {
      const response = await globalThis.fetch(`${base}${path}`, {
        ...init,
        headers: { "content-type": "application/json", ...init.headers },
        body: init.body && typeof init.body !== "string" ? JSON.stringify(init.body) : init.body,
      });
      const text = await response.text();
      let body = text;
      try {
        body = JSON.parse(text);
      } catch {
        // No es JSON (el streaming del chat): se deja como texto
      }
      return { status: response.status, headers: response.headers, body };
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** El host de la API en los tests (ROUTLY_API_URL por defecto). */
export const API = "localhost:3000/api/shop";

/**
 * Una respuesta de OpenRouter con streaming: cada trozo es el delta de un chunk ({ content } o
 * { tool_calls }), y se manda como "data: {...}" hasta el [DONE]. Los trozos se parten a propósito
 * por la mitad para comprobar que se juntan bien.
 */
export function sseResponse(deltas, { model = "google/gemini-2.5-flash" } = {}) {
  const lines = deltas.map((delta) =>
    typeof delta === "string" && delta.startsWith(":")
      ? `${delta}\n\n`
      : `data: ${JSON.stringify(delta.error ? delta : { model, choices: [{ index: 0, delta }] })}\n\n`,
  );
  const text = `${lines.join("")}data: [DONE]\n\n`;
  const half = Math.floor(text.length / 2);
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text.slice(0, half)));
      controller.enqueue(encoder.encode(text.slice(half)));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

/** Los eventos de un streaming SSE de /ai/chat, como [{ event, data }]. */
export function parseEvents(text) {
  return text
    .split("\n\n")
    .filter(Boolean)
    .map((block) => {
      const event = /^event: (.+)$/m.exec(block)?.[1];
      const data = /^data: (.+)$/m.exec(block)?.[1];
      return { event, data: data ? JSON.parse(data) : null };
    });
}
