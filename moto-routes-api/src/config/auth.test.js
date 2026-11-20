import assert from "node:assert/strict";
import { test } from "node:test";
import { authConfigFrom } from "./auth.js";

test("fuera de producción, por defecto el JWKS del servicio de auth local", () => {
  const config = authConfigFrom({ NODE_ENV: "development" });
  assert.equal(config.jwksUrl.href, "http://localhost:3002/auth/.well-known/jwks.json");
  assert.equal(config.issuer, "routly-auth");
  assert.equal(config.audience, "routly");
});

test("en producción AUTH_JWKS_URL es obligatoria", () => {
  assert.throws(() => authConfigFrom({ NODE_ENV: "production" }), /AUTH_JWKS_URL is not defined/);
  const config = authConfigFrom({ NODE_ENV: "production", AUTH_JWKS_URL: "https://routly.dev/auth/.well-known/jwks.json" });
  assert.equal(config.jwksUrl.protocol, "https:");
});

test("JWT_ISSUER y JWT_AUDIENCE cambian lo que se exige al token", () => {
  const config = authConfigFrom({ JWT_ISSUER: " otro ", JWT_AUDIENCE: "panel" });
  assert.equal(config.issuer, "otro");
  assert.equal(config.audience, "panel");
});

test("una AUTH_JWKS_URL que no es una URL http(s) para el servidor al arrancar", () => {
  assert.throws(() => authConfigFrom({ AUTH_JWKS_URL: "no es una url" }), /AUTH_JWKS_URL has an invalid value/);
  assert.throws(() => authConfigFrom({ AUTH_JWKS_URL: "file:///etc/passwd" }), /AUTH_JWKS_URL has an invalid value/);
});
