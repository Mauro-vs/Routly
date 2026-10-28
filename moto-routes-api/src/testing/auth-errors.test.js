import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import { errorHandler } from "../middlewares/errorHandler.js";
import { forbidden, unauthorized } from "../utils/errors.js";

// Los 401 y 403 pasan por el errorHandler real: mismo formato que el resto de errores.
// No necesita MongoDB.
let server;
let base;
before(async () => {
  const app = express();
  app.get("/no-token", () => {
    throw unauthorized();
  });
  app.get("/expired", () => {
    throw unauthorized("TOKEN_EXPIRED");
  });
  app.get("/forbidden", () => {
    throw forbidden();
  });
  app.use(errorHandler);

  server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  base = `http://localhost:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));

test("401 sin token: mensaje fijo y WWW-Authenticate: Bearer", async () => {
  const response = await fetch(`${base}/no-token`);

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("www-authenticate"), "Bearer");
  assert.deepEqual(await response.json(), {
    statusCode: 401,
    error: "Unauthorized",
    message: "Authentication required",
  });
});

test("401 con token caducado: mismo mensaje, con code e invalid_token", async () => {
  const response = await fetch(`${base}/expired`);

  assert.equal(response.headers.get("www-authenticate"), 'Bearer error="invalid_token"');
  assert.deepEqual(await response.json(), {
    statusCode: 401,
    error: "Unauthorized",
    message: "Authentication required",
    code: "TOKEN_EXPIRED",
  });
});

test("403: mensaje fijo y sin WWW-Authenticate", async () => {
  const response = await fetch(`${base}/forbidden`);

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("www-authenticate"), null);
  assert.deepEqual(await response.json(), {
    statusCode: 403,
    error: "Forbidden",
    message: "You do not have permission to access this resource",
  });
});
