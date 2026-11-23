import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rawRequest, startStack } from "../testing/helpers.js";

describe("límites de peticiones", () => {
  it("el general corta con 429, Retry-After y el formato común", async () => {
    const stack = await startStack({ env: { RATE_LIMIT_MAX: "3", RATE_LIMIT_WINDOW_MS: "60000", ACCESS_LOG: "true" } });
    try {
      for (let i = 0; i < 3; i++) assert.equal((await stack.gateway.request("/api/shop/experiences")).status, 200);
      const { status, headers, body } = await stack.gateway.request("/auth/.well-known/jwks.json");
      assert.equal(status, 429);
      assert.ok(Number(headers.get("retry-after")) >= 1);
      assert.deepEqual(body, { statusCode: 429, error: "Too Many Requests", message: "Too many requests, please try again later" });
      assert.equal(stack.gateway.logs.at(-1).blockedBy, "rate limit (general)");
      assert.equal(stack.auth.requests.length, 0);
    } finally {
      await stack.close();
    }
  });

  it("los frontales y /gateway no cuentan", async () => {
    const stack = await startStack({ env: { RATE_LIMIT_MAX: "1" } });
    try {
      for (let i = 0; i < 5; i++) {
        assert.equal((await rawRequest(stack.gateway.base, "/main.js", { headers: { host: "routly.localhost" } })).status, 200);
        assert.equal((await stack.gateway.request("/gateway/health")).status, 200);
      }
    } finally {
      await stack.close();
    }
  });

  it("el de la IA, más estricto, solo para el chat y los textos", async () => {
    const stack = await startStack({ env: { AI_RATE_LIMIT_MAX: "2" } });
    try {
      const chat = () => stack.gateway.request("/ai/chat", { method: "POST" });
      assert.equal((await chat()).status, 200);
      assert.equal((await stack.gateway.request("/ai/experiences/costa/insights")).status, 200);
      assert.equal((await chat()).status, 429);
      // El tiempo y las paradas no gastan cuota de la IA
      assert.equal((await stack.gateway.request("/ai/experiences/costa/weather")).status, 200);
    } finally {
      await stack.close();
    }
  });
});

describe("HSTS", () => {
  it("solo en producción con HTTPS", async () => {
    const dev = await startStack();
    const prod = await startStack({ env: { NODE_ENV: "production" } });
    try {
      assert.equal((await dev.gateway.request("/gateway/health")).headers.get("strict-transport-security"), null);
      assert.equal(
        (await prod.gateway.request("/gateway/health")).headers.get("strict-transport-security"),
        "max-age=15552000; includeSubDomains",
      );
    } finally {
      await dev.close();
      await prod.close();
    }
  });
});
