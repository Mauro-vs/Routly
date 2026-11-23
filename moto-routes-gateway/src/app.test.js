import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { startStack } from "./testing/helpers.js";

describe("reparto por prefijo", () => {
  let stack;
  before(async () => {
    stack = await startStack({
      auth: {
        // Como el login de auth: dos cookies con su Path, que tienen que llegar intactas
        "POST /auth/login": (req, res) => {
          res.setHeader("set-cookie", [
            "routly_session=abc.def.ghi; Path=/; HttpOnly; SameSite=Strict",
            "routly_refresh=opaco; Path=/auth; HttpOnly; SameSite=Strict",
          ]);
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ ok: true }));
        },
      },
    });
  });
  after(() => stack.close());

  for (const [path, service] of [
    ["/api/shop/experiences", "api"],
    ["/api", "api"],
    ["/auth/me", "auth"],
    ["/auth/.well-known/jwks.json", "auth"],
    ["/ai/experiences/costa/weather", "ai"],
    ["/health", "api"],
  ]) {
    it(`${path} va a ${service}, con la misma ruta`, async () => {
      const { status, body } = await stack.gateway.request(path);
      assert.equal(status, 200);
      assert.equal(body.url, path);
      assert.equal(stack[service].requests.at(-1).url, path);
    });
  }

  it("la query llega intacta", async () => {
    const { body } = await stack.gateway.request("/api/shop/experiences?q=costa%20brava&page=2&sort=-price");
    assert.equal(body.url, "/api/shop/experiences?q=costa%20brava&page=2&sort=-price");
  });

  it("un prefijo parecido no cuenta: /apix no es /api", async () => {
    const before = stack.api.requests.length;
    const { status, body } = await stack.gateway.request("/apix/users");
    // Sin prefijo de servicio, toca a un frontal, y 127.0.0.1 no es ninguno
    assert.equal(status, 421);
    assert.equal(body.message, "Unknown host: use routly.localhost or panel.routly.localhost");
    assert.equal(stack.api.requests.length, before);
  });

  it("reenvía el método, el cuerpo, Cookie y Authorization sin tocarlos", async () => {
    const { body } = await stack.gateway.request("/api/routes/1", {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: "routly_session=a.b.c", authorization: "Bearer x.y.z" },
      body: JSON.stringify({ name: "Costa" }),
    });
    assert.equal(body.method, "PATCH");
    assert.equal(body.body, '{"name":"Costa"}');
    assert.equal(body.headers.cookie, "routly_session=a.b.c");
    assert.equal(body.headers.authorization, "Bearer x.y.z");
  });

  it("el Set-Cookie de auth llega tal cual: mismo Path y sin Domain", async () => {
    const { headers } = await stack.gateway.request("/auth/login", { method: "POST" });
    assert.deepEqual(headers.getSetCookie(), [
      "routly_session=abc.def.ghi; Path=/; HttpOnly; SameSite=Strict",
      "routly_refresh=opaco; Path=/auth; HttpOnly; SameSite=Strict",
    ]);
  });

  it("conserva el Host y añade sus X-Forwarded-*", async () => {
    const { body } = await stack.gateway.request("/api/routes");
    const host = new URL(stack.gateway.base).host;
    assert.equal(body.headers.host, host);
    assert.equal(body.headers["x-forwarded-host"], host);
    assert.equal(body.headers["x-forwarded-proto"], "http");
    assert.equal(body.headers["x-forwarded-for"], "127.0.0.1");
  });

  it("borra los X-Forwarded-* y la IP que se inventa el cliente", async () => {
    const { body } = await stack.gateway.request("/api/routes", {
      headers: {
        "x-forwarded-for": "6.6.6.6",
        "x-forwarded-proto": "https",
        "x-forwarded-host": "evil.example",
        forwarded: "for=6.6.6.6",
        "x-real-ip": "6.6.6.6",
      },
    });
    assert.equal(body.headers["x-forwarded-for"], "127.0.0.1");
    assert.equal(body.headers["x-forwarded-proto"], "http");
    assert.notEqual(body.headers["x-forwarded-host"], "evil.example");
    assert.equal(body.headers.forwarded, undefined);
    assert.equal(body.headers["x-real-ip"], undefined);
  });

  it("nadie puede colar cabeceras de identidad", async () => {
    const { body } = await stack.gateway.request("/api/users", {
      headers: { "x-user-id": "1", "x-user-role": "admin", "x-auth-user": "admin", "x-authenticated-user": "admin" },
    });
    for (const name of ["x-user-id", "x-user-role", "x-auth-user", "x-authenticated-user"]) {
      assert.equal(body.headers[name], undefined, name);
    }
  });

  it("no dice que es Express", async () => {
    const { headers } = await stack.gateway.request("/gateway/health");
    assert.equal(headers.get("x-powered-by"), null);
  });

  it("un cuerpo más grande que MAX_BODY_BYTES es un 413 y no llega al servicio", async () => {
    const small = await startStack({ env: { MAX_BODY_BYTES: "1024" } });
    try {
      const { status, body } = await small.gateway.request("/api/images", { method: "POST", body: "x".repeat(2048) });
      assert.equal(status, 413);
      assert.equal(body.message, "Request body is larger than 1024 bytes");
      assert.equal(small.api.requests.length, 0);
    } finally {
      await small.close();
    }
  });
});
