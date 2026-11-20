import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PASSWORD, login, startApp } from "../testing/helpers.js";

describe("seguridad", () => {
  let app;
  before(async () => {
    app = await startApp();
  });
  after(() => app.close());

  describe("CSRF (cabecera Origin)", () => {
    it("un POST desde otra web es un 403, aunque traiga la cookie", async () => {
      const client = app.client();
      await login(client);
      for (const path of ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/logout-all", "/auth/register"]) {
        const { status, body } = await client.request(path, { method: "POST", body: {}, headers: { origin: "https://malvada.example" } });
        assert.equal(status, 403, path);
        assert.equal(body.message, "Request origin not allowed");
      }
      // La sesión sigue abierta: el logout de la otra web no ha hecho nada
      assert.equal((await client.request("/auth/me")).status, 200);
    });

    it("desde el propio origen o localhost (desarrollo) sí", async () => {
      const client = app.client();
      const fromPanel = await client.request("/auth/login", {
        method: "POST",
        body: { email: "rider@routly.dev", password: PASSWORD },
        headers: { origin: "http://localhost:4200" },
      });
      assert.equal(fromPanel.status, 200);
      const self = await client.request("/auth/refresh", { method: "POST", headers: { origin: app.baseUrl } });
      assert.equal(self.status, 200);
    });

    it("en producción, localhost ya no vale: solo CORS_ORIGIN", async () => {
      const prod = await startApp({ env: { NODE_ENV: "production", CORS_ORIGIN: "https://panel.routly.dev" } });
      try {
        const client = prod.client();
        const body = { email: "rider@routly.dev", password: PASSWORD };
        const local = await client.request("/auth/login", { method: "POST", body, headers: { origin: "http://localhost:4200" } });
        assert.equal(local.status, 403);
        const panel = await client.request("/auth/login", { method: "POST", body, headers: { origin: "https://panel.routly.dev" } });
        assert.equal(panel.status, 200);
      } finally {
        await prod.close();
      }
    });
  });

  describe("límite de intentos", () => {
    let limited;
    before(async () => {
      limited = await startApp({ env: { RATE_LIMIT: "true" } });
    });
    after(() => limited.close());

    it("5 fallos contra el mismo correo bloquean ese correo, venga de la IP que venga", async () => {
      const client = limited.client();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        assert.equal((await login(client, "admin@routly.dev", "mala-1234")).status, 401);
      }
      const blocked = await login(client, "Admin@Routly.dev", PASSWORD);
      assert.equal(blocked.status, 429);
      assert.equal(blocked.body.message, "Too many attempts, please try again later");
      // Otro correo desde la misma IP aún puede entrar (lleva 6 fallos de 10)
      assert.equal((await login(client, "rider@routly.dev", PASSWORD)).status, 200);
    });
  });

  describe("cookies", () => {
    it("al abrir sesión borra la cookie vieja de la API (Path=/api)", async () => {
      const { setCookies } = await login(app.client());
      const legacy = setCookies.find((cookie) => cookie.name === "routly_session" && cookie.attributes.path === "/api");
      assert.ok(legacy);
      assert.equal(legacy.value, "");
    });

    it("en producción: __Secure-, Secure y sin token en el body", async () => {
      const prod = await startApp({ env: { NODE_ENV: "production" } });
      try {
        const { status, body, setCookies } = await login(prod.client());
        assert.equal(status, 200);
        assert.equal(body.token, undefined);
        const names = setCookies.filter((cookie) => cookie.value !== "").map((cookie) => cookie.name).sort();
        assert.deepEqual(names, ["__Secure-routly_refresh", "__Secure-routly_session"]);
        assert.ok(setCookies.every((cookie) => cookie.attributes.secure === true));
      } finally {
        await prod.close();
      }
    });

    it("las respuestas con tokens no se guardan en cachés", async () => {
      const { headers } = await login(app.client());
      assert.equal(headers.get("cache-control"), "no-store");
    });
  });
});
