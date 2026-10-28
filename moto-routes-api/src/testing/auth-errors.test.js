import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import { authorizeOwnership, authorizeRoles } from "../middlewares/authorize.js";
import { errorHandler } from "../middlewares/errorHandler.js";
import { createAuthLimiter } from "../middlewares/rateLimit.js";
import { canAccessUserResource } from "../utils/access.js";
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

  // authorizeRoles y authorizeOwnership sin base de datos: req.user llega en una cabecera
  app.use((req, res, next) => {
    const user = req.headers["x-test-user"];
    if (user) req.user = JSON.parse(user);
    next();
  });
  app.get("/hosts-only", authorizeRoles("host", "admin"), (req, res) => res.json({ ok: true }));
  const USERS = { u1: { _id: "u1" } };
  app.get(
    "/users/:id",
    authorizeOwnership((req) => USERS[req.params.id], canAccessUserResource, "User"),
    (req, res) => res.json({ ok: true })
  );
  // El límite de intentos, con 2 en vez de 10 y sin saltarse en los tests
  app.post("/login", createAuthLimiter({ limit: 2, skip: () => false }), (req, res) => res.json({ ok: true }));
  // Como el del login: solo cuentan los fallos (aquí, ?ok=0)
  app.post(
    "/login-failures",
    createAuthLimiter({ limit: 2, skip: () => false, onlyFailures: true }),
    (req, res) => res.status(req.query.ok === "1" ? 200 : 401).json({})
  );
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

const as = (user) => ({ headers: { "x-test-user": JSON.stringify(user) } });

test("authorizeRoles: sin req.user 401, otro rol 403, rol permitido pasa", async () => {
  assert.equal((await fetch(`${base}/hosts-only`)).status, 401);
  assert.equal((await fetch(`${base}/hosts-only`, as({ id: "u1", role: "rider" }))).status, 403);
  assert.equal((await fetch(`${base}/hosts-only`, as({ id: "u1", role: "host" }))).status, 200);
  assert.equal((await fetch(`${base}/hosts-only`, as({ id: "u1", role: "admin" }))).status, 200);
});

test("authorizeOwnership: el dueño y el admin pasan; otro, 403; si no existe, 404", async () => {
  assert.equal((await fetch(`${base}/users/u1`)).status, 401);
  assert.equal((await fetch(`${base}/users/u1`, as({ id: "u1", role: "rider" }))).status, 200);
  assert.equal((await fetch(`${base}/users/u1`, as({ id: "u2", role: "rider" }))).status, 403);
  assert.equal((await fetch(`${base}/users/u1`, as({ id: "u9", role: "admin" }))).status, 200);
  assert.equal((await fetch(`${base}/users/u7`, as({ id: "u9", role: "admin" }))).status, 404);
});

test("límite de intentos: a partir del tercero, 429 con el formato de error de siempre", async () => {
  assert.equal((await fetch(`${base}/login`, { method: "POST" })).status, 200);
  assert.equal((await fetch(`${base}/login`, { method: "POST" })).status, 200);

  const blocked = await fetch(`${base}/login`, { method: "POST" });
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get("ratelimit"));
  assert.deepEqual(await blocked.json(), {
    statusCode: 429,
    error: "Too Many Requests",
    message: "Too many attempts, please try again later",
  });
});

test("en el login solo cuentan los intentos fallidos", async () => {
  const post = (ok) => fetch(`${base}/login-failures?ok=${ok}`, { method: "POST" });

  for (let i = 0; i < 5; i++) assert.equal((await post(1)).status, 200);
  assert.equal((await post(0)).status, 401);
  assert.equal((await post(0)).status, 401);
  assert.equal((await post(0)).status, 429);
});
