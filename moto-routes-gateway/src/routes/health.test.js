import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deadUrl, startStack } from "../testing/helpers.js";

describe("salud de la gateway", () => {
  it("GET /gateway/health no pregunta a nadie", async () => {
    const stack = await startStack({ env: { API_URL: await deadUrl() } });
    try {
      const { status, body } = await stack.gateway.request("/gateway/health");
      assert.equal(status, 200);
      assert.deepEqual(body, { ok: true });
    } finally {
      await stack.close();
    }
  });

  it("GET /gateway/ready: 200 si contestan los tres", async () => {
    const stack = await startStack();
    try {
      const { status, body } = await stack.gateway.request("/gateway/ready");
      assert.equal(status, 200);
      assert.deepEqual(body, { ok: true, services: { api: "up", auth: "up", ai: "up" } });
      assert.ok(stack.ai.requests.some((request) => request.url === "/health"));
    } finally {
      await stack.close();
    }
  });

  it("GET /gateway/ready: 503 y cuál falla si uno está caído o no contesta", async () => {
    const stack = await startStack({
      env: { AI_URL: await deadUrl(), HEALTH_TIMEOUT_MS: "200" },
      auth: { "GET /health": () => {} }, // no contesta nunca
    });
    try {
      const { status, body } = await stack.gateway.request("/gateway/ready");
      assert.equal(status, 503);
      assert.deepEqual(body, { ok: false, services: { api: "up", auth: "down", ai: "down" } });
    } finally {
      await stack.close();
    }
  });
});
