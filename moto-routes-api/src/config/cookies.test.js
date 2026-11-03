import assert from "node:assert/strict";
import { test } from "node:test";
import { cookieConfigFrom } from "./cookies.js";

test("por defecto: sin Secure fuera de producción, SameSite=Strict y el nombre sin prefijo", () => {
  assert.deepEqual({ ...cookieConfigFrom({ NODE_ENV: "development" }) }, {
    name: "routly_session",
    secure: false,
    sameSite: "strict",
  });
});

test("en producción: Secure y el nombre con el prefijo __Secure-", () => {
  const config = cookieConfigFrom({ NODE_ENV: "production" });
  assert.equal(config.secure, true);
  assert.equal(config.name, "__Secure-routly_session");
});

test("COOKIE_SECURE manda sobre NODE_ENV, en los dos sentidos", () => {
  assert.equal(cookieConfigFrom({ NODE_ENV: "development", COOKIE_SECURE: "true" }).name, "__Secure-routly_session");
  assert.equal(cookieConfigFrom({ NODE_ENV: "production", COOKIE_SECURE: "false" }).secure, false);
  assert.equal(cookieConfigFrom({ COOKIE_SECURE: " TRUE " }).secure, true);
});

test("COOKIE_SAMESITE acepta strict y lax", () => {
  assert.equal(cookieConfigFrom({ COOKIE_SAMESITE: "lax" }).sameSite, "lax");
  assert.equal(cookieConfigFrom({ COOKIE_SAMESITE: "Strict" }).sameSite, "strict");
});

test("SameSite=None no se admite: necesitaría un token CSRF", () => {
  assert.throws(() => cookieConfigFrom({ COOKIE_SAMESITE: "none" }), /COOKIE_SAMESITE=none is not supported/);
});

test("un valor desconocido para el servidor al arrancar, con el nombre de la variable", () => {
  assert.throws(() => cookieConfigFrom({ COOKIE_SECURE: "si" }), /COOKIE_SECURE has an invalid value/);
  assert.throws(() => cookieConfigFrom({ COOKIE_SAMESITE: "estricto" }), /COOKIE_SAMESITE has an invalid value/);
});
