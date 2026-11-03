import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { createAuthLimiter } from "../middlewares/rateLimit.js";
import { applyTrustProxy, trustProxyFrom } from "./proxy.js";

test("TRUST_PROXY: 0 por defecto, también en producción", () => {
  assert.equal(trustProxyFrom({}), 0);
  assert.equal(trustProxyFrom({ NODE_ENV: "production" }), 0);
  assert.equal(trustProxyFrom({ TRUST_PROXY: " 1 " }), 1);
  assert.equal(trustProxyFrom({ TRUST_PROXY: "2" }), 2);
});

test("TRUST_PROXY que no es un número de proxies: el servidor no arranca", () => {
  for (const value of ["true", "-1", "1.5", "loopback"]) {
    assert.throws(() => trustProxyFrom({ TRUST_PROXY: value }), /TRUST_PROXY has an invalid value/, value);
  }
});

/**
 * Un servidor con el límite de intentos real (2 por ventana) y el TRUST_PROXY que se le
 * pase. Devuelve los códigos de 3 intentos de cada una de dos IPs.
 */
async function attemptsFrom(env) {
  const app = express();
  applyTrustProxy(app, env);
  app.post("/login", createAuthLimiter({ limit: 2, skip: () => false }), (req, res) => res.status(204).end());
  app.use((error, req, res, next) => res.status(error.status ?? 500).end());

  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const url = `http://localhost:${server.address().port}/login`;
  const statuses = {};
  try {
    for (const ip of ["203.0.113.1", "203.0.113.2"]) {
      statuses[ip] = [];
      for (let i = 0; i < 3; i++) {
        const response = await fetch(url, { method: "POST", headers: { "x-forwarded-for": ip } });
        statuses[ip].push(response.status);
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  return statuses;
}

test("detrás de un proxy (TRUST_PROXY=1), el límite de intentos cuenta cada cliente por su IP", async () => {
  assert.deepEqual(await attemptsFrom({ TRUST_PROXY: "1" }), {
    "203.0.113.1": [204, 204, 429],
    "203.0.113.2": [204, 204, 429],
  });
});

test("sin TRUST_PROXY, X-Forwarded-For no cuenta: inventarse una IP no salta el límite", async (t) => {
  // express-rate-limit avisa por consola de que llega X-Forwarded-For sin confiar en el
  // proxy: es justo lo que se prueba aquí
  t.mock.method(console, "error", () => {});
  assert.deepEqual(await attemptsFrom({}), {
    "203.0.113.1": [204, 204, 429],
    "203.0.113.2": [429, 429, 429],
  });
});
