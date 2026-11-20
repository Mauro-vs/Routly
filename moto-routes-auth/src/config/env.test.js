import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadConfig, parseDuration } from "./env.js";

describe("loadConfig", () => {
  it("sin nada en el entorno usa los valores de desarrollo", () => {
    const config = loadConfig({});
    assert.equal(config.port, 3002);
    assert.equal(config.mongodbUri, "mongodb://localhost:27017/moto_routes");
    assert.equal(config.jwt.issuer, "routly-auth");
    assert.equal(config.jwt.audience, "routly");
    assert.equal(config.jwt.accessTtl, 15 * 60);
    assert.equal(config.jwt.refreshTtl, 7 * 86_400);
    assert.equal(config.jwt.privateKeyFile, "keys/private.pem");
    assert.deepEqual(config.cookies, { secure: false, sameSite: "strict" });
    assert.equal(config.tokenInBody, true);
    assert.equal(config.rateLimit, true);
    assert.equal(config.swagger, true);
  });

  it("en producción: cookies Secure, sin token en el body ni Swagger", () => {
    const config = loadConfig({ NODE_ENV: "production" });
    assert.equal(config.cookies.secure, true);
    assert.equal(config.tokenInBody, false);
    assert.equal(config.swagger, false);
  });

  it("en producción no arranca con COOKIE_SECURE=false", () => {
    assert.throws(() => loadConfig({ NODE_ENV: "production", COOKIE_SECURE: "false" }), /COOKIE_SECURE/);
  });

  it("la clave del entorno acepta los \\n escapados", () => {
    const config = loadConfig({ JWT_PRIVATE_KEY: "-----BEGIN-----\\nabc\\n-----END-----" });
    assert.equal(config.jwt.privateKey, "-----BEGIN-----\nabc\n-----END-----");
  });

  it("lee las duraciones con unidad y los orígenes separados por comas", () => {
    const config = loadConfig({ ACCESS_TOKEN_TTL: "5m", REFRESH_TOKEN_TTL: "30d", CORS_ORIGIN: " https://a.dev , https://b.dev ," });
    assert.equal(config.jwt.accessTtl, 300);
    assert.equal(config.jwt.refreshTtl, 30 * 86_400);
    assert.deepEqual(config.corsOrigins, ["https://a.dev", "https://b.dev"]);
  });

  it("con un valor que no vale lanza un error que dice cuál", () => {
    assert.throws(() => loadConfig({ PORT: "abc" }), /PORT/);
    assert.throws(() => loadConfig({ ACCESS_TOKEN_TTL: "10" }), /ACCESS_TOKEN_TTL/);
    assert.throws(() => loadConfig({ ACCESS_TOKEN_TTL: "2d" }), /ACCESS_TOKEN_TTL/);
    assert.throws(() => loadConfig({ REFRESH_TOKEN_TTL: "1y" }), /REFRESH_TOKEN_TTL/);
    assert.throws(() => loadConfig({ COOKIE_SAMESITE: "none" }), /COOKIE_SAMESITE/);
    assert.throws(() => loadConfig({ COOKIE_SECURE: "yes" }), /COOKIE_SECURE/);
  });
});

describe("parseDuration", () => {
  it("segundos sin unidad y s, m, h, d", () => {
    assert.equal(parseDuration("900"), 900);
    assert.equal(parseDuration("15m"), 900);
    assert.equal(parseDuration("1h"), 3600);
    assert.equal(parseDuration("7d"), 604_800);
    assert.equal(parseDuration("7 semanas"), null);
  });
});
