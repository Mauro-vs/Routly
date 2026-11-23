import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import https from "node:https";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import selfsigned from "selfsigned";
import { createApp } from "./app.js";
import { createServers, loadTls } from "./servers.js";
import { rawRequest, startUpstream, testConfig } from "./testing/helpers.js";

const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => server.closeAllConnections() || server.close(resolve));

describe("loadTls", () => {
  it("sin certificado, dice cómo crearlo", () => {
    const empty = mkdtempSync(path.join(tmpdir(), "routly-certs-"));
    try {
      assert.throws(() => loadTls({ certFile: "certs/cert.pem", keyFile: "certs/key.pem" }, empty), /npm run certs/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe("servidores", () => {
  let api;
  let main;
  let redirect;
  let port;
  let redirectPort;

  before(async () => {
    api = await startUpstream();
    const pems = await selfsigned.generate([{ name: "commonName", value: "localhost" }], { keySize: 2048, algorithm: "sha256" });
    // El puerto de la gateway lo elige el sistema: se configura después de abrirlo
    const config = testConfig({ API_URL: api.url, HTTP_PORT: "8080" });
    const app = createApp({ config });
    ({ main, redirect } = createServers({ app, config: { ...config, port: 4000 }, tls: { cert: pems.cert, key: pems.private } }));
    port = await listen(main);
    redirectPort = await listen(redirect);
  });
  after(async () => {
    await close(main);
    await close(redirect);
    await api.close();
  });

  it("va por HTTPS y a los servicios les dice que el protocolo es https", async () => {
    const body = await new Promise((resolve, reject) => {
      https
        .get(`https://127.0.0.1:${port}/api/routes`, { rejectUnauthorized: false }, async (response) => {
          let text = "";
          for await (const chunk of response) text += chunk;
          resolve(JSON.parse(text));
        })
        .on("error", reject);
    });
    assert.equal(body.url, "/api/routes");
    assert.equal(body.headers["x-forwarded-proto"], "https");
  });

  it("HTTP_PORT redirige a HTTPS con la misma ruta", async () => {
    const { status, headers } = await rawRequest(`http://127.0.0.1:${redirectPort}`, "/experiencias?q=1", {
      headers: { host: "routly.localhost:8080" },
    });
    assert.equal(status, 301);
    assert.equal(headers.location, "https://routly.localhost:4000/experiencias?q=1");
  });

  it("y nunca a un nombre que no es nuestro", async () => {
    const { headers } = await rawRequest(`http://127.0.0.1:${redirectPort}`, "/", { headers: { host: "evil.example" } });
    assert.equal(headers.location, "https://routly.localhost:4000/");
  });

  it("sin HTTP_PORT no hay servidor de redirección", () => {
    const config = testConfig();
    assert.equal(createServers({ app: createApp({ config }), config, tls: null }).redirect, null);
  });
});
