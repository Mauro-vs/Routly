import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import { createToken, tokenLifetime, verifyToken } from "./jwt.js";

// La configuración se lee en la primera firma: basta con fijarla antes
const SECRET = "secreto-de-los-tests-con-mas-de-32-caracteres";
process.env.JWT_SECRET = SECRET;
process.env.JWT_EXPIRES_IN = "1h";

const USER = { _id: "6710a1b2c3d4e5f6a7b8c910", email: "ana@example.com", role: "host", tokenVersion: 3 };

// El 401 que lanza verifyToken, con su code
function assertUnauthorized(fn, code) {
  assert.throws(fn, (error) => {
    assert.equal(error.status, 401);
    assert.equal(error.message, "Authentication required");
    assert.equal(error.code, code);
    return true;
  });
}

test("createToken firma { sub, email, role, tv } con HS256 y verifyToken lo devuelve", () => {
  const token = createToken(USER);
  const payload = verifyToken(token);

  assert.equal(jwt.decode(token, { complete: true }).header.alg, "HS256");
  assert.equal(payload.sub, USER._id);
  assert.equal(payload.email, USER.email);
  assert.equal(payload.role, "host");
  assert.equal(payload.tv, 3);
  assert.match(payload.jti, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.equal(tokenLifetime(token), 3600);
  // La contraseña o el hash nunca van en el token
  assert.ok(!("password" in payload) && !("passwordHash" in payload));
});

test("cada token tiene su propio jti, aunque sea del mismo usuario y el mismo segundo", () => {
  const jtis = new Set(Array.from({ length: 20 }, () => verifyToken(createToken(USER)).jti));
  assert.equal(jtis.size, 20);
});

test("sin token: 401 sin code", () => {
  assertUnauthorized(() => verifyToken(undefined), undefined);
  assertUnauthorized(() => verifyToken(""), undefined);
});

test("un token caducado: 401 TOKEN_EXPIRED", () => {
  const expired = jwt.sign({ sub: USER._id, role: "host", tv: 0, exp: Math.floor(Date.now() / 1000) - 10 }, SECRET);
  assertUnauthorized(() => verifyToken(expired), "TOKEN_EXPIRED");
});

test("con la firma alterada: 401 TOKEN_INVALID", () => {
  const token = createToken(USER);
  const [header, payload, signature] = token.split(".");
  // Se cambia el rol a admin y se conserva la firma original: ya no coincide
  const forged = Buffer.from(JSON.stringify({ ...jwt.decode(token), role: "admin" })).toString("base64url");

  assertUnauthorized(() => verifyToken(`${header}.${forged}.${signature}`), "TOKEN_INVALID");
  assertUnauthorized(() => verifyToken(`${header}.${payload}.firma-inventada`), "TOKEN_INVALID");
});

test("el algoritmo none se rechaza", () => {
  const unsigned = jwt.sign({ sub: USER._id, role: "admin", tv: 0 }, null, { algorithm: "none" });
  assertUnauthorized(() => verifyToken(unsigned), "TOKEN_INVALID");
});

test("un token firmado con otro secreto o con otro algoritmo HMAC se rechaza", () => {
  const otherSecret = jwt.sign({ sub: USER._id, role: "admin", tv: 0 }, "otro-secreto-de-mas-de-32-caracteres!!");
  const hs512 = jwt.sign({ sub: USER._id, role: "admin", tv: 0 }, SECRET, { algorithm: "HS512" });

  assertUnauthorized(() => verifyToken(otherSecret), "TOKEN_INVALID");
  assertUnauthorized(() => verifyToken(hs512), "TOKEN_INVALID");
});

test("un token bien firmado pero sin sub, role, tv o jti válidos no sirve", () => {
  const jti = "6f1c9a52-3b0e-4d7a-9c1f-2e8b4a6d0c13";
  for (const payload of [
    { role: "admin", tv: 0, jti },
    { sub: "123", role: "admin", tv: 0, jti },
    { sub: USER._id, tv: 0, jti },
    { sub: USER._id, role: "admin", jti },
    // Un token de antes de la lista negra, sin jti, ya no sirve: hay que iniciar sesión otra vez
    { sub: USER._id, role: "admin", tv: 0 },
    { sub: USER._id, role: "admin", tv: 0, jti: "no-es-un-uuid" },
  ]) {
    assertUnauthorized(() => verifyToken(jwt.sign(payload, SECRET)), "TOKEN_INVALID");
  }
  assertUnauthorized(() => verifyToken("esto.no.es-un-jwt"), "TOKEN_INVALID");
});
