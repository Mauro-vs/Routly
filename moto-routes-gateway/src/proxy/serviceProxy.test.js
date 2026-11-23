import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deadUrl, startStack } from "../testing/helpers.js";
import { matchesPrefix } from "./serviceProxy.js";

describe("matchesPrefix", () => {
  it("el prefijo y lo que cuelga de él, nada más", () => {
    assert.equal(matchesPrefix("/api", "/api"), true);
    assert.equal(matchesPrefix("/api/", "/api"), true);
    assert.equal(matchesPrefix("/api/users/1", "/api"), true);
    assert.equal(matchesPrefix("/apix", "/api"), false);
    assert.equal(matchesPrefix("/ap", "/api"), false);
    assert.equal(matchesPrefix("/v1/api", "/api"), false);
  });
});

describe("errores de los servicios", () => {
  it("un servicio caído es un 502 con el formato común", async () => {
    const stack = await startStack({ env: { AUTH_URL: await deadUrl() } });
    try {
      const { status, body } = await stack.gateway.request("/auth/me");
      assert.equal(status, 502);
      assert.deepEqual(body, { statusCode: 502, error: "Bad Gateway", message: "The auth service is not available" });
      // Los demás siguen funcionando
      assert.equal((await stack.gateway.request("/api/routes")).status, 200);
    } finally {
      await stack.close();
    }
  });

  it("un servicio que no contesta a tiempo es un 504", async () => {
    const stack = await startStack({
      env: { UPSTREAM_TIMEOUT_MS: "200" },
      api: { "GET /api/slow": () => {} }, // no contesta nunca
    });
    try {
      const started = Date.now();
      const { status, body } = await stack.gateway.request("/api/slow");
      assert.equal(status, 504);
      assert.deepEqual(body, { statusCode: 504, error: "Gateway Timeout", message: "The api service took too long to answer" });
      assert.ok(Date.now() - started < 2000);
    } finally {
      await stack.close();
    }
  });

  it("la IA tiene su propio plazo, más largo", async () => {
    const stack = await startStack({
      env: { UPSTREAM_TIMEOUT_MS: "100", AI_TIMEOUT_MS: "2000" },
      ai: {
        "GET /ai/experiences/costa/insights": (req, res) => {
          setTimeout(() => res.end(JSON.stringify({ summary: "ok" })), 400);
        },
      },
    });
    try {
      const { status, body } = await stack.gateway.request("/ai/experiences/costa/insights");
      assert.equal(status, 200);
      assert.deepEqual(body, { summary: "ok" });
    } finally {
      await stack.close();
    }
  });

  it("los errores del servicio pasan tal cual (un 401 con su code)", async () => {
    const stack = await startStack({
      api: {
        "GET /api/users": (req, res) => {
          res.statusCode = 401;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ statusCode: 401, error: "Unauthorized", message: "Authentication required", code: "TOKEN_EXPIRED" }));
        },
      },
    });
    try {
      const { status, body } = await stack.gateway.request("/api/users");
      assert.equal(status, 401);
      assert.equal(body.code, "TOKEN_EXPIRED");
    } finally {
      await stack.close();
    }
  });
});

describe("streaming del chat (SSE)", () => {
  it("cada evento llega en cuanto la IA lo manda, sin esperar al final", async () => {
    let release;
    const second = new Promise((resolve) => (release = resolve));
    const stack = await startStack({
      // Un plazo corto: un streaming que sigue mandando no caduca (el plazo es de inactividad)
      env: { AI_TIMEOUT_MS: "300" },
      ai: {
        "POST /ai/chat": async (req, res) => {
          res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
          res.write('event: delta\ndata: {"text":"Hola"}\n\n');
          await second;
          res.end('event: done\ndata: {}\n\n');
        },
      },
    });
    try {
      const response = await fetch(`${stack.gateway.base}/ai/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      });
      assert.equal(response.headers.get("content-type"), "text/event-stream");
      assert.equal(response.headers.get("content-encoding"), null);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // El primero llega mientras la IA todavía no ha mandado el segundo
      const first = decoder.decode((await reader.read()).value);
      assert.match(first, /"text":"Hola"/);
      assert.doesNotMatch(first, /done/);

      release();
      let rest = "";
      for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) rest += decoder.decode(chunk.value);
      assert.match(rest, /event: done/);
    } finally {
      release();
      await stack.close();
    }
  });
});
