import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createLocalJWKSet, jwtVerify } from "jose";
import { login, startApp } from "./testing/helpers.js";

describe("app", () => {
  let app;
  before(async () => {
    app = await startApp();
  });
  after(() => app.close());

  it("GET /health y /auth/health", async () => {
    for (const path of ["/health", "/auth/health"]) {
      const { status, body } = await app.client().request(path);
      assert.equal(status, 200);
      assert.deepEqual(body, { ok: true });
    }
  });

  it("el JWKS publica la clave pública, se puede cachear y valida los tokens como harán la API y la IA", async () => {
    const client = app.client();
    const { status, body: jwks, headers } = await client.request("/auth/.well-known/jwks.json");
    assert.equal(status, 200);
    assert.equal(headers.get("cache-control"), "public, max-age=300");
    assert.equal(jwks.keys[0].d, undefined);

    const { body } = await login(client);
    const { payload } = await jwtVerify(body.token, createLocalJWKSet(jwks), {
      algorithms: ["RS256"],
      issuer: "routly-auth",
      audience: "routly",
    });
    assert.equal(payload.sub, body.user.id);
    assert.equal(payload.role, "rider");
  });

  it("un endpoint que no existe responde 404 con el formato de la API", async () => {
    const { status, body } = await app.client().request("/auth/nada");
    assert.equal(status, 404);
    assert.deepEqual(body, { statusCode: 404, error: "Not Found", message: "Endpoint GET /auth/nada not found" });
  });

  it("un JSON mal formado es un 400 y uno enorme un 413", async () => {
    const malformed = await app.client().request("/auth/login", { method: "POST", body: "{mal" });
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.message, "Malformed JSON in request body");
    const huge = await app.client().request("/auth/login", { method: "POST", body: { email: "a".repeat(20_000), password: "x" } });
    assert.equal(huge.status, 413);
  });

  it("lleva las cabeceras de helmet y no dice que es Express", async () => {
    const { headers } = await app.client().request("/health");
    assert.equal(headers.get("x-frame-options"), "DENY");
    assert.equal(headers.get("x-powered-by"), null);
  });

  it("Swagger en /auth/docs fuera de producción, y en producción no", async () => {
    assert.equal((await app.client().request("/auth/docs/")).status, 200);
    assert.equal((await app.client().request("/auth/docs.json")).body.info.title, "Routly Auth");

    const prod = await startApp({ env: { NODE_ENV: "production" } });
    try {
      assert.equal((await prod.client().request("/auth/docs/")).status, 404);
    } finally {
      await prod.close();
    }
  });
});
