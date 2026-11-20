import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { before, describe, it } from "node:test";
import { SignJWT, UnsecuredJWT, decodeProtectedHeader } from "jose";
import { loadKeys } from "../config/keys.js";
import { generatePem, testConfig } from "../testing/helpers.js";
import { createTokenService } from "./token.service.js";

const USER_ID = "665f1c2e9b1e8a0012345678";
const SESSION_ID = "0d6c2c4e-6f53-4bb9-9a0e-6d2f3c1b7a10";
const base64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

describe("tokens de acceso", () => {
  let config;
  let keys;
  let tokens;
  let clock;

  before(async () => {
    config = testConfig();
    keys = await loadKeys(config.jwt);
    clock = { time: Date.now() };
    tokens = createTokenService({ keys, jwt: config.jwt, now: () => clock.time });
  });

  const sign = () => tokens.signAccess({ userId: USER_ID, role: "admin", tokenVersion: 3, sessionId: SESSION_ID });

  // Un token con el payload de los nuestros, firmado a mano con otra clave o algoritmo
  const payload = () => ({
    sub: USER_ID,
    role: "admin",
    tv: 3,
    sid: SESSION_ID,
    jti: "4b0a8d3e-2f5c-4c1a-9e7b-1a2b3c4d5e6f",
    iss: config.jwt.issuer,
    aud: config.jwt.audience,
    iat: Math.floor(clock.time / 1000),
    exp: Math.floor(clock.time / 1000) + 600,
  });

  it("firma RS256 con el kid y lo comprueba", async () => {
    const token = await sign();
    assert.deepEqual(decodeProtectedHeader(token), { alg: "RS256", kid: keys.kid, typ: "JWT" });
    const verified = await tokens.verifyAccess(token);
    assert.equal(verified.sub, USER_ID);
    assert.equal(verified.role, "admin");
    assert.equal(verified.tv, 3);
    assert.equal(verified.sid, SESSION_ID);
    assert.equal(verified.exp - verified.iat, config.jwt.accessTtl);
    // Sin datos personales: un JWT se lee sin clave
    assert.equal(verified.email, undefined);
    assert.equal(verified.name, undefined);
  });

  it("caducado: 401 TOKEN_EXPIRED (con 30 s de margen de reloj)", async () => {
    const token = await sign();
    clock.time += (config.jwt.accessTtl + 20) * 1000;
    await tokens.verifyAccess(token);
    clock.time += 20 * 1000;
    await assert.rejects(tokens.verifyAccess(token), { status: 401, code: "TOKEN_EXPIRED" });
    clock.time = Date.now();
  });

  it('no acepta alg "none"', async () => {
    const token = new UnsecuredJWT(payload()).encode();
    await assert.rejects(tokens.verifyAccess(token), { status: 401, code: "TOKEN_INVALID" });
  });

  it("no acepta un HS256 firmado con la clave pública como secreto (confusión de algoritmo)", async () => {
    const publicPem = generatePem().publicKey; // da igual cuál: el ataque usa la pública conocida
    const header = base64url({ alg: "HS256", kid: keys.kid, typ: "JWT" });
    const body = base64url(payload());
    const signature = createHmac("sha256", publicPem).update(`${header}.${body}`).digest("base64url");
    await assert.rejects(tokens.verifyAccess(`${header}.${body}.${signature}`), { status: 401, code: "TOKEN_INVALID" });
  });

  it("no acepta un token firmado con otra clave, aunque diga nuestro kid", async () => {
    const other = await loadKeys(testConfig({ JWT_PRIVATE_KEY: generatePem().privateKey }).jwt);
    const token = await new SignJWT(payload()).setProtectedHeader({ alg: "RS256", kid: keys.kid }).sign(other.privateKey);
    await assert.rejects(tokens.verifyAccess(token), { status: 401, code: "TOKEN_INVALID" });
  });

  it("no hace caso de una clave que venga dentro del token (cabecera jwk)", async () => {
    const other = await loadKeys(testConfig({ JWT_PRIVATE_KEY: generatePem().privateKey }).jwt);
    const token = await new SignJWT(payload())
      .setProtectedHeader({ alg: "RS256", kid: keys.kid, jwk: other.jwks.keys[0] })
      .sign(other.privateKey);
    await assert.rejects(tokens.verifyAccess(token), { status: 401, code: "TOKEN_INVALID" });
  });

  it("no acepta otro emisor ni otra audiencia", async () => {
    for (const change of [{ iss: "otro-servicio" }, { aud: "otra-app" }]) {
      const token = await new SignJWT({ ...payload(), ...change })
        .setProtectedHeader({ alg: "RS256", kid: keys.kid })
        .sign(keys.privateKey);
      await assert.rejects(tokens.verifyAccess(token), { status: 401, code: "TOKEN_INVALID" });
    }
  });

  it("no acepta un token al que le falta algo nuestro (sid, tv...)", async () => {
    const { sid, ...withoutSession } = payload();
    const token = await new SignJWT(withoutSession).setProtectedHeader({ alg: "RS256", kid: keys.kid }).sign(keys.privateKey);
    await assert.rejects(tokens.verifyAccess(token), { status: 401, code: "TOKEN_INVALID" });
  });

  it("un token tocado (payload cambiado) no vale", async () => {
    const [header, , signature] = (await sign()).split(".");
    const forged = `${header}.${base64url({ ...payload(), role: "admin", sub: "665f1c2e9b1e8a0099999999" })}.${signature}`;
    await assert.rejects(tokens.verifyAccess(forged), { status: 401, code: "TOKEN_INVALID" });
  });

  it("los refresh son aleatorios y se guardan como hash", () => {
    const a = tokens.newRefreshToken();
    const b = tokens.newRefreshToken();
    assert.notEqual(a.token, b.token);
    assert.match(a.token, /^[A-Za-z0-9_-]{43}$/);
    assert.notEqual(a.hash, a.token);
  });
});
