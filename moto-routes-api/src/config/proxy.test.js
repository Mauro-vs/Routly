import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
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

/** La IP con la que Express ve una petición que dice venir de 203.0.113.1, con ese TRUST_PROXY. */
async function ipSeenWith(env) {
  const app = express();
  applyTrustProxy(app, env);
  app.get("/ip", (req, res) => res.json({ ip: req.ip, protocol: req.protocol }));

  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const response = await fetch(`http://localhost:${server.address().port}/ip`, {
      headers: { "x-forwarded-for": "203.0.113.1", "x-forwarded-proto": "https" },
    });
    return await response.json();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("detrás de un proxy (TRUST_PROXY=1), Express ve la IP y el protocolo del cliente", async () => {
  assert.deepEqual(await ipSeenWith({ TRUST_PROXY: "1" }), { ip: "203.0.113.1", protocol: "https" });
});

test("sin TRUST_PROXY, X-Forwarded-* no cuentan: nadie se inventa su IP ni el https", async () => {
  const seen = await ipSeenWith({});
  assert.notEqual(seen.ip, "203.0.113.1");
  assert.equal(seen.protocol, "http");
});
