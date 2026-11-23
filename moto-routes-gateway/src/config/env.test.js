import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadConfig } from "./env.js";

describe("loadConfig", () => {
  it("sin nada, los valores de desarrollo", () => {
    const config = loadConfig({});
    assert.equal(config.port, 4000);
    assert.equal(config.services.api.target, "http://127.0.0.1:3000");
    assert.equal(config.services.auth.target, "http://127.0.0.1:3002");
    assert.equal(config.services.ai.target, "http://127.0.0.1:3001");
    assert.equal(config.services.ai.timeoutMs, 90_000);
    assert.equal(config.accessLog, true);
    assert.equal(config.https, true);
    assert.equal(config.httpPort, null);
    assert.deepEqual(config.tls, { certFile: "certs/cert.pem", keyFile: "certs/key.pem" });
    assert.deepEqual(config.frontends.web, { name: "web", host: "routly.localhost", target: "http://localhost:4300", dist: null });
    assert.deepEqual(config.frontends.panel, { name: "panel", host: "panel.routly.localhost", target: "http://localhost:4200", dist: null });
  });

  it("los nombres de los frontales, sin puerto ni protocolo y distintos", () => {
    assert.equal(loadConfig({ WEB_HOST: "Routly.Test" }).frontends.web.host, "routly.test");
    assert.throws(() => loadConfig({ WEB_HOST: "https://routly.localhost:4000" }), /WEB_HOST/);
    assert.throws(() => loadConfig({ WEB_HOST: "a.localhost", PANEL_HOST: "a.localhost" }), /must be different/);
  });

  it("quita la barra final de las URL", () => {
    assert.equal(loadConfig({ API_URL: "http://api:3000/" }).services.api.target, "http://api:3000");
  });

  it("en los tests, sin registro salvo que se pida", () => {
    assert.equal(loadConfig({ NODE_ENV: "test" }).accessLog, false);
    assert.equal(loadConfig({ NODE_ENV: "test", ACCESS_LOG: "true" }).accessLog, true);
  });

  it("una configuración que no vale lanza un error legible", () => {
    assert.throws(() => loadConfig({ PORT: "abc", API_URL: "ftp://x" }), /Invalid configuration in \.env:[\s\S]*PORT[\s\S]*API_URL/);
  });
});
