import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { startStack } from "../testing/helpers.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("X-Request-Id y registro", () => {
  let stack;
  before(async () => {
    stack = await startStack({ env: { ACCESS_LOG: "true" } });
  });
  after(() => stack.close());

  it("crea uno, lo manda al servicio y lo devuelve", async () => {
    const { headers, body } = await stack.gateway.request("/api/routes");
    const id = headers.get("x-request-id");
    assert.match(id, UUID);
    assert.equal(body.headers["x-request-id"], id);
  });

  it("respeta uno válido que mande el cliente", async () => {
    const id = "0b8f9a1e-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
    const { headers, body } = await stack.gateway.request("/api/routes", { headers: { "x-request-id": id } });
    assert.equal(headers.get("x-request-id"), id);
    assert.equal(body.headers["x-request-id"], id);
  });

  it("cambia uno que no es un UUID", async () => {
    const { headers } = await stack.gateway.request("/api/routes", { headers: { "x-request-id": "<script>" } });
    assert.match(headers.get("x-request-id"), UUID);
  });

  it("una línea por petición, sin query, cookies ni tokens", async () => {
    const { headers } = await stack.gateway.request("/api/shop/experiences?q=correo@ejemplo.com", {
      headers: { cookie: "routly_session=secreto", authorization: "Bearer secreto" },
    });
    const line = stack.gateway.logs.find((entry) => entry.requestId === headers.get("x-request-id"));
    assert.deepEqual(Object.keys(line).sort(), ["method", "ms", "path", "requestId", "service", "status", "time"]);
    assert.equal(line.path, "/api/shop/experiences");
    assert.equal(line.service, "api");
    assert.equal(line.status, 200);
    assert.equal(line.method, "GET");
    assert.doesNotMatch(JSON.stringify(stack.gateway.logs), /secreto|correo@ejemplo/);
  });

  it("lo que contesta la gateway lleva service null", async () => {
    await stack.gateway.request("/no-existe");
    const line = stack.gateway.logs.at(-1);
    assert.equal(line.path, "/no-existe");
    assert.equal(line.service, null);
    assert.equal(line.status, 421);
  });
});
