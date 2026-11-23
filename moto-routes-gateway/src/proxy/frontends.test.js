import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { deadUrl, rawRequest, startStack } from "../testing/helpers.js";

const WEB = "routly.localhost:4000";
const PANEL = "panel.routly.localhost:4000";

describe("frontales en desarrollo (su ng serve)", () => {
  let stack;
  before(async () => {
    stack = await startStack();
  });
  after(() => stack.close());

  it("routly.localhost es la web, con la misma ruta", async () => {
    const { status, body } = await rawRequest(stack.gateway.base, "/experiencias/costa?fecha=2026-12", { headers: { host: WEB } });
    assert.equal(status, 200);
    assert.equal(body.url, "/experiencias/costa?fecha=2026-12");
    // A ng serve le llega su propio Host (el único que acepta) y el original en X-Forwarded-Host
    assert.equal(body.headers.host, new URL(stack.web.url).host);
    assert.equal(body.headers["x-forwarded-host"], WEB);
  });

  it("panel.routly.localhost es el panel (sin distinguir mayúsculas)", async () => {
    const { body } = await rawRequest(stack.gateway.base, "/rutas", { headers: { host: "Panel.Routly.Localhost:4000" } });
    assert.equal(body.url, "/rutas");
    assert.equal(stack.panel.requests.at(-1).url, "/rutas");
  });

  it("/api, /auth y /ai van a su servicio desde cualquiera de los dos", async () => {
    for (const host of [WEB, PANEL]) {
      const { body } = await rawRequest(stack.gateway.base, "/api/routes", { headers: { host } });
      assert.equal(body.url, "/api/routes");
      // A los servicios les llega el Host de verdad: con él comprueban el Origin (CSRF)
      assert.equal(body.headers.host, host);
    }
  });

  it("un nombre que no es de nadie es un 421", async () => {
    const { status, body } = await rawRequest(stack.gateway.base, "/", { headers: { host: "evil.example" } });
    assert.equal(status, 421);
    assert.deepEqual(body, {
      statusCode: 421,
      error: "Misdirected Request",
      message: "Unknown host: use routly.localhost or panel.routly.localhost",
    });
  });

  it("si ng serve no está en marcha, 502", async () => {
    const down = await startStack({ env: { WEB_URL: await deadUrl() } });
    try {
      const { status, body } = await rawRequest(down.gateway.base, "/", { headers: { host: WEB } });
      assert.equal(status, 502);
      assert.equal(body.message, "The web app is not available");
    } finally {
      await down.close();
    }
  });

  it("el WebSocket del live reload llega a su ng serve y va en los dos sentidos", async () => {
    const socket = await new Promise((resolve, reject) => {
      const request = http.request(`${stack.gateway.base}/ng-cli-ws`, {
        headers: { host: WEB, connection: "Upgrade", upgrade: "websocket", "x-forwarded-for": "6.6.6.6" },
      });
      request.on("upgrade", (response, upgraded) => resolve(upgraded));
      request.on("response", () => reject(new Error("no upgrade")));
      request.on("error", reject);
      request.end();
    });
    const echo = new Promise((resolve) => socket.once("data", (data) => resolve(String(data))));
    socket.write("ping");
    assert.equal(await echo, "ping");
    socket.destroy();

    const upgrade = stack.web.requests.findLast((request) => request.upgrade);
    assert.equal(upgrade.url, "/ng-cli-ws");
    assert.notEqual(upgrade.headers["x-forwarded-for"], "6.6.6.6");
    assert.equal(stack.panel.requests.some((request) => request.upgrade), false);
  });

  it("un WebSocket a un nombre que no es de nadie se cierra", async () => {
    const closed = await new Promise((resolve) => {
      const request = http.request(`${stack.gateway.base}/`, {
        headers: { host: "evil.example", connection: "Upgrade", upgrade: "websocket" },
      });
      request.on("upgrade", () => resolve(false));
      request.on("error", () => resolve(true));
      request.end();
    });
    assert.equal(closed, true);
  });
});

describe("frontales compilados (dist)", () => {
  let stack;
  let dist;
  before(async () => {
    dist = mkdtempSync(path.join(tmpdir(), "routly-web-"));
    writeFileSync(path.join(dist, "index.html"), "<app-root></app-root>");
    writeFileSync(path.join(dist, "main-ABCD1234.js"), "console.log('routly')");
    writeFileSync(path.join(dist, "favicon.ico"), "ico");
    stack = await startStack({ env: { WEB_DIST: dist } });
  });
  after(async () => {
    await stack.close();
    rmSync(dist, { recursive: true, force: true });
  });

  const get = (path, init = {}) => rawRequest(stack.gateway.base, path, { ...init, headers: { host: WEB, ...init.headers } });

  it("/ y cualquier ruta de la app sirven el index.html, sin caché", async () => {
    for (const path of ["/", "/experiencias/costa", "/mi-cuenta?tab=1"]) {
      const { status, text, headers } = await get(path);
      assert.equal(status, 200, path);
      assert.equal(text, "<app-root></app-root>");
      assert.equal(headers["cache-control"], "no-cache");
    }
    assert.equal(stack.web.requests.length, 0);
  });

  it("los archivos con hash, con caché de un año; los demás se revalidan", async () => {
    const main = await get("/main-ABCD1234.js");
    assert.equal(main.text, "console.log('routly')");
    assert.equal(main.headers["cache-control"], "public, max-age=31536000, immutable");
    assert.equal((await get("/favicon.ico")).headers["cache-control"], "no-cache");
  });

  it("un archivo que no existe es un 404, no el index.html", async () => {
    const { status, body } = await get("/logo.png");
    assert.equal(status, 404);
    assert.equal(body.message, "Endpoint GET /logo.png not found");
  });

  it("no sale de la carpeta", async () => {
    const { status } = await get("/..%2f..%2fetc%2fpasswd");
    assert.notEqual(status, 200);
  });

  it("el panel sigue yendo a su ng serve", async () => {
    const { body } = await rawRequest(stack.gateway.base, "/rutas", { headers: { host: PANEL } });
    assert.equal(body.url, "/rutas");
  });
});
