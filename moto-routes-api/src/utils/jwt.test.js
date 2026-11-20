import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { test } from "node:test";
import { UnsecuredJWT } from "jose";
import { TEST_JWKS, otherPrivateKey, signTestToken, useTestKeys } from "../testing/tokens.js";
import { verifyToken } from "./jwt.js";

// Los tokens los firma el servicio de auth (RS256); aquí, la clave de prueba de testing/tokens.js
useTestKeys();

const USER = { _id: "6710a1b2c3d4e5f6a7b8c910", role: "host", tokenVersion: 3 };
const base64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

// El 401 que lanza verifyToken, con su code
async function assertUnauthorized(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.status, 401);
    assert.equal(error.message, "Authentication required");
    assert.equal(error.code, code);
    return true;
  });
}

// Un payload como los del servicio de auth, para firmarlo a mano con otra clave o algoritmo
const payload = (extra = {}) => ({
  sub: USER._id,
  role: "admin",
  tv: 0,
  sid: randomUUID(),
  jti: randomUUID(),
  iss: "routly-auth",
  aud: "routly",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 600,
  ...extra,
});

test("un token RS256 del servicio de auth se comprueba con su JWKS y devuelve el payload", async () => {
  const verified = await verifyToken(await signTestToken(USER));
  assert.equal(verified.sub, USER._id);
  assert.equal(verified.role, "host");
  assert.equal(verified.tv, 3);
  assert.match(verified.jti, /^[0-9a-f-]{36}$/);
});

test("sin token: 401 sin code", async () => {
  await assertUnauthorized(verifyToken(undefined), undefined);
  await assertUnauthorized(verifyToken(""), undefined);
});

test("un token caducado: 401 TOKEN_EXPIRED (con 30 s de margen de reloj)", async () => {
  await assertUnauthorized(verifyToken(await signTestToken(USER, { expiresIn: -60 })), "TOKEN_EXPIRED");
  // 10 s tarde aún vale: los relojes de los dos servicios pueden ir un poco desfasados
  await verifyToken(await signTestToken(USER, { expiresIn: -10 }));
});

test("con la firma alterada: 401 TOKEN_INVALID", async () => {
  const [header, , signature] = (await signTestToken(USER)).split(".");
  await assertUnauthorized(verifyToken(`${header}.${base64url(payload())}.${signature}`), "TOKEN_INVALID");
  await assertUnauthorized(verifyToken(`${header}.${base64url(payload())}.firma-inventada`), "TOKEN_INVALID");
});

test('el algoritmo "none" se rechaza', async () => {
  await assertUnauthorized(verifyToken(new UnsecuredJWT(payload()).encode()), "TOKEN_INVALID");
});

test("un HS256 firmado con la clave pública como secreto se rechaza (confusión de algoritmo)", async () => {
  const header = base64url({ alg: "HS256", kid: TEST_JWKS.keys[0].kid, typ: "JWT" });
  const body = base64url(payload());
  const secret = JSON.stringify(TEST_JWKS.keys[0]);
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  await assertUnauthorized(verifyToken(`${header}.${body}.${signature}`), "TOKEN_INVALID");
});

test("firmado con otra clave, aunque diga nuestro kid, o con un kid que no está en el JWKS: 401", async () => {
  await assertUnauthorized(verifyToken(await signTestToken(USER, { key: otherPrivateKey })), "TOKEN_INVALID");
  await assertUnauthorized(verifyToken(await signTestToken(USER, { kid: "otra-clave" })), "TOKEN_INVALID");
});

test("de otro emisor o para otra audiencia: 401", async () => {
  await assertUnauthorized(verifyToken(await signTestToken(USER, { issuer: "otro-servicio" })), "TOKEN_INVALID");
  await assertUnauthorized(verifyToken(await signTestToken(USER, { audience: "otra-app" })), "TOKEN_INVALID");
});

test("bien firmado pero sin sub, role, tv o jti válidos no sirve", async () => {
  for (const claims of [{ role: 7 }, { tv: "0" }, { tv: 1.5 }]) {
    await assertUnauthorized(verifyToken(await signTestToken(USER, { claims })), "TOKEN_INVALID");
  }
  await assertUnauthorized(verifyToken(await signTestToken({ ...USER, _id: "123" })), "TOKEN_INVALID");
  await assertUnauthorized(verifyToken("esto.no.es-un-jwt"), "TOKEN_INVALID");
});
