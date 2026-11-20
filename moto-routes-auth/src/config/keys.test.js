import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { generatePem, testConfig } from "../testing/helpers.js";
import { loadKeys } from "./keys.js";

describe("loadKeys", () => {
  it("publica solo la parte pública, con kid, alg y use", async () => {
    const keys = await loadKeys(testConfig().jwt);
    assert.equal(keys.jwks.keys.length, 1);
    const [jwk] = keys.jwks.keys;
    assert.deepEqual(Object.keys(jwk).sort(), ["alg", "e", "kid", "kty", "n", "use"]);
    assert.equal(jwk.alg, "RS256");
    assert.equal(jwk.kid, keys.kid);
    // Nada de la privada: d, p, q, dp, dq, qi
    for (const secret of ["d", "p", "q", "dp", "dq", "qi"]) assert.equal(jwk[secret], undefined);
  });

  it("el kid es la huella de la clave: la misma clave da el mismo kid", async () => {
    const config = testConfig();
    assert.equal((await loadKeys(config.jwt)).kid, (await loadKeys(config.jwt)).kid);
  });

  it("no acepta claves RSA de menos de 2048 bits ni claves que no son RSA", async () => {
    const weak = generatePem(1024).privateKey;
    await assert.rejects(loadKeys(testConfig({ JWT_PRIVATE_KEY: weak }).jwt), /at least 2048 bits/);
    await assert.rejects(loadKeys(testConfig({ JWT_PRIVATE_KEY: "no es un pem" }).jwt), /not a valid PEM/);
  });

  it("sin clave en el entorno ni archivo, dice cómo crearla", async () => {
    const config = testConfig({ JWT_PRIVATE_KEY: "", JWT_PRIVATE_KEY_FILE: "keys/no-existe.pem" });
    await assert.rejects(loadKeys(config.jwt), /npm run keys/);
  });

  it("al rotar publica también la clave anterior", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "routly-keys-"));
    const previousFile = path.join(dir, "previous.pem");
    writeFileSync(previousFile, generatePem().publicKey);

    const keys = await loadKeys(testConfig({ JWT_PREVIOUS_PUBLIC_KEY_FILE: previousFile }).jwt);
    assert.equal(keys.jwks.keys.length, 2);
    assert.equal(keys.jwks.keys[0].kid, keys.kid);
    assert.notEqual(keys.jwks.keys[1].kid, keys.kid);
  });
});
