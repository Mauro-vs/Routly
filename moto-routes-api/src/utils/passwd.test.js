import assert from "node:assert/strict";
import { test } from "node:test";
import argon2 from "argon2";
import { hashPassword, needsRehash, verifyPassword } from "./passwd.js";

test("el hash es Argon2id con los parámetros de OWASP y lleva su propia sal", async () => {
  const hash = await hashPassword("clave1234");

  assert.ok(hash.startsWith("$argon2id$"));
  assert.match(hash, /\$m=19456,p=1,t=2\$/);
  // Misma contraseña, sal distinta: dos hashes diferentes
  assert.notEqual(hash, await hashPassword("clave1234"));
});

test("verifyPassword acepta la contraseña correcta y rechaza la incorrecta", async () => {
  const hash = await hashPassword("clave1234");

  assert.equal(await verifyPassword(hash, "clave1234"), true);
  assert.equal(await verifyPassword(hash, "clave12345"), false);
  assert.equal(await verifyPassword(hash, ""), false);
});

test("un hash vacío o mal formado devuelve false, no un error", async () => {
  for (const hash of ["", "no-es-un-hash", "$argon2id$roto", "$2b$10$abcdefghijklmnopqrstuv", undefined]) {
    assert.equal(await verifyPassword(hash, "clave1234"), false);
  }
});

test("needsRehash detecta los hashes con otros parámetros o de otro algoritmo", async () => {
  assert.equal(needsRehash(await hashPassword("clave1234")), false);

  const weaker = await argon2.hash("clave1234", { type: argon2.argon2id, memoryCost: 8192, timeCost: 1, parallelism: 1 });
  assert.equal(needsRehash(weaker), true);
  // Un hash de bcrypt (o cualquier cosa que no sea Argon2) también hay que rehacerlo
  assert.equal(needsRehash("$2b$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQ"), true);
});
