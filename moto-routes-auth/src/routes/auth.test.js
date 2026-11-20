import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { PASSWORD, login, startApp } from "../testing/helpers.js";

describe("sesión", () => {
  let app;
  let client;

  before(async () => {
    app = await startApp();
  });
  after(() => app.close());
  beforeEach(() => {
    client = app.client();
  });

  describe("POST /auth/register", () => {
    it("crea un rider con su perfil y abre sesión con las dos cookies", async () => {
      const { status, body, setCookies } = await client.request("/auth/register", {
        method: "POST",
        body: { name: "  Nueva Rider ", email: " Nueva@Routly.dev ", password: "moto-5678" },
      });
      assert.equal(status, 201);
      assert.equal(body.tokenType, "Bearer");
      assert.equal(body.expiresIn, 900);
      assert.deepEqual(body.user, { id: body.user.id, name: "Nueva Rider", email: "nueva@routly.dev", role: "rider" });
      assert.ok(app.db.profiles.some((profile) => profile.userId === body.user.id));
      // El hash nunca sale, y el refresh nunca va en el body
      assert.equal(JSON.stringify(body).includes("argon2"), false);
      assert.equal(body.refreshToken, undefined);

      const session = setCookies.find((cookie) => cookie.name === "routly_session" && cookie.attributes.path === "/");
      const refresh = setCookies.find((cookie) => cookie.name === "routly_refresh");
      assert.equal(session.value, body.token);
      assert.equal(session.attributes.httponly, true);
      assert.equal(session.attributes.samesite, "Strict");
      assert.equal(session.attributes["max-age"], "900");
      assert.equal(refresh.attributes.path, "/auth");
      assert.equal(refresh.attributes.httponly, true);
      assert.equal(refresh.attributes["max-age"], String(7 * 86_400));
    });

    it("no deja elegir el rol ni otros campos", async () => {
      const { status, body } = await client.request("/auth/register", {
        method: "POST",
        body: { name: "Lista", email: "lista@routly.dev", password: "moto-5678", role: "admin" },
      });
      assert.equal(status, 400);
      assert.deepEqual(body.details, [{ field: "role", message: "role is not allowed" }]);
    });

    it("aplica las reglas de la contraseña y del correo", async () => {
      const { status, body } = await client.request("/auth/register", {
        method: "POST",
        body: { name: "Débil", email: "no-es-correo", password: "12345678" },
      });
      assert.equal(status, 400);
      const fields = body.details.map((detail) => detail.field).sort();
      assert.deepEqual(fields, ["email", "password"]);
    });

    it("un correo ya registrado es un 409", async () => {
      const { status, body } = await client.request("/auth/register", {
        method: "POST",
        body: { name: "Otra", email: "RIDER@routly.dev", password: "moto-5678" },
      });
      assert.equal(status, 409);
      assert.equal(body.message, "A user with this email already exists");
    });
  });

  describe("POST /auth/login", () => {
    it("abre sesión y /auth/me responde con la cookie y con Bearer", async () => {
      const { status, body } = await login(client);
      assert.equal(status, 200);
      assert.equal(body.user.role, "rider");

      const byCookie = await client.request("/auth/me");
      assert.equal(byCookie.status, 200);
      assert.deepEqual(byCookie.body, body.user);

      const byBearer = await app.client().request("/auth/me", { headers: { authorization: `Bearer ${body.token}` } });
      assert.deepEqual(byBearer.body, body.user);
    });

    it("el mismo 401 si el correo no existe, la contraseña no es o la cuenta está desactivada", async () => {
      const answers = await Promise.all([
        login(client, "nadie@routly.dev"),
        login(client, "rider@routly.dev", "otra-1234"),
        login(client, "off@routly.dev"),
      ]);
      for (const { status, body, setCookies } of answers) {
        assert.equal(status, 401);
        assert.equal(body.message, "Invalid email or password");
        assert.equal(setCookies.length, 0);
      }
    });

    it("un usuario con el rol desactivado no entra", async () => {
      app.db.roles.find((role) => role._id === app.roles.admin._id).isActive = false;
      try {
        assert.equal((await login(client, "admin@routly.dev")).status, 401);
      } finally {
        app.db.roles.find((role) => role._id === app.roles.admin._id).isActive = true;
      }
    });

    it("rehace un hash con parámetros antiguos", async () => {
      const user = app.db.users.find((u) => u._id === app.users.rider._id);
      const argon2 = (await import("argon2")).default;
      user.passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id, memoryCost: 8 * 1024, timeCost: 1 });
      const old = user.passwordHash;
      assert.equal((await login(client)).status, 200);
      assert.notEqual(user.passwordHash, old);
      assert.match(user.passwordHash, /m=19456/);
    });
  });

  describe("POST /auth/refresh", () => {
    it("cambia el refresh por otro y da un token de acceso nuevo", async () => {
      await login(client);
      const firstRefresh = client.cookie("routly_refresh");
      const firstAccess = client.cookie("routly_session");

      const { status, body } = await client.request("/auth/refresh", { method: "POST" });
      assert.equal(status, 200);
      assert.equal(body.user.email, "rider@routly.dev");
      assert.notEqual(client.cookie("routly_refresh"), firstRefresh);
      assert.notEqual(client.cookie("routly_session"), firstAccess);
      assert.equal((await client.request("/auth/me")).status, 200);
    });

    it("sin cookie de refresh, 401", async () => {
      const { status } = await client.request("/auth/refresh", { method: "POST" });
      assert.equal(status, 401);
    });

    it("dos pestañas a la vez: el refresh recién gastado vale unos segundos", async () => {
      await login(client);
      const shared = client.cookie("routly_refresh");
      const tabA = await client.request("/auth/refresh", { method: "POST" });
      app.clock.advance(3000);
      client.setCookie("routly_refresh", shared, "/auth");
      const tabB = await client.request("/auth/refresh", { method: "POST" });
      assert.equal(tabA.status, 200);
      assert.equal(tabB.status, 200);
    });

    it("un refresh reutilizado fuera de la gracia cierra todas las sesiones del usuario", async () => {
      await login(client);
      const stolen = client.cookie("routly_refresh");
      // El usuario de verdad renueva...
      assert.equal((await client.request("/auth/refresh", { method: "POST" })).status, 200);
      const victimAccess = client.cookie("routly_session");

      // ...y más tarde el atacante prueba con el que copió
      app.clock.advance(60_000);
      const attacker = app.client();
      attacker.setCookie("routly_refresh", stolen, "/auth");
      const reuse = await attacker.request("/auth/refresh", { method: "POST" });
      assert.equal(reuse.status, 401);
      assert.ok(reuse.setCookies.some((cookie) => cookie.name === "routly_refresh" && cookie.value === ""));

      // Se cierra todo: el refresh nuevo de la víctima y su token de acceso (tokenVersion)
      assert.equal((await client.request("/auth/refresh", { method: "POST" })).status, 401);
      const me = await app.client().request("/auth/me", { headers: { authorization: `Bearer ${victimAccess}` } });
      assert.equal(me.status, 401);
    });

    it("caducado, no vale", async () => {
      await login(client);
      app.clock.advance((app.config.jwt.refreshTtl + 1) * 1000);
      assert.equal((await client.request("/auth/refresh", { method: "POST" })).status, 401);
    });

    it("si desactivan al usuario desde el panel, el refresh deja de valer", async () => {
      const { body } = await login(client, "admin@routly.dev");
      const admin = app.db.users.find((u) => u._id === body.user.id);
      admin.isActive = false;
      try {
        assert.equal((await client.request("/auth/refresh", { method: "POST" })).status, 401);
      } finally {
        admin.isActive = true;
      }
    });

    it("tampoco si la API ha subido el tokenVersion (cambio de contraseña desde el panel)", async () => {
      const { body } = await login(client);
      app.db.users.find((u) => u._id === body.user.id).tokenVersion += 1;
      assert.equal((await client.request("/auth/refresh", { method: "POST" })).status, 401);
    });
  });

  describe("POST /auth/logout", () => {
    it("cierra esta sesión: el token va a la lista negra, el refresh se borra y las cookies también", async () => {
      const { body } = await login(client);
      const refresh = client.cookie("routly_refresh");

      const { status, setCookies } = await client.request("/auth/logout", { method: "POST" });
      assert.equal(status, 204);
      const cleared = setCookies.filter((cookie) => cookie.value === "").map((cookie) => `${cookie.name} ${cookie.attributes.path}`);
      assert.ok(cleared.includes("routly_session /"));
      assert.ok(cleared.includes("routly_refresh /auth"));

      const me = await app.client().request("/auth/me", { headers: { authorization: `Bearer ${body.token}` } });
      assert.equal(me.status, 401);
      const again = app.client();
      again.setCookie("routly_refresh", refresh, "/auth");
      assert.equal((await again.request("/auth/refresh", { method: "POST" })).status, 401);
    });

    it("también sale con el token de acceso caducado (solo con el refresh)", async () => {
      await login(client);
      app.clock.advance((app.config.jwt.accessTtl + 60) * 1000);
      assert.equal((await client.request("/auth/me")).status, 401);
      assert.equal((await client.request("/auth/logout", { method: "POST" })).status, 204);
      assert.equal(client.cookie("routly_refresh"), undefined);
    });

    it("sin sesión también responde 204", async () => {
      assert.equal((await client.request("/auth/logout", { method: "POST" })).status, 204);
    });

    it("no cierra las demás sesiones del usuario", async () => {
      const other = app.client();
      await login(other);
      await login(client);
      await client.request("/auth/logout", { method: "POST" });
      assert.equal((await other.request("/auth/me")).status, 200);
      assert.equal((await other.request("/auth/refresh", { method: "POST" })).status, 200);
    });
  });

  describe("POST /auth/logout-all", () => {
    it("cierra todas las sesiones, en todos los dispositivos", async () => {
      const phone = app.client();
      await login(phone);
      await login(client);
      assert.equal((await client.request("/auth/logout-all", { method: "POST" })).status, 204);
      assert.equal((await phone.request("/auth/me")).status, 401);
      assert.equal((await phone.request("/auth/refresh", { method: "POST" })).status, 401);
    });

    it("sin sesión, 401", async () => {
      const { status, headers } = await client.request("/auth/logout-all", { method: "POST" });
      assert.equal(status, 401);
      assert.equal(headers.get("www-authenticate"), "Bearer");
    });
  });

  describe("PATCH /auth/password", () => {
    it("cambia la contraseña, cierra las demás sesiones y renueva esta", async () => {
      const phone = app.client();
      await login(phone, "admin@routly.dev");
      await login(client, "admin@routly.dev");

      const { status } = await client.request("/auth/password", {
        method: "PATCH",
        body: { currentPassword: PASSWORD, newPassword: "nueva-5678" },
      });
      assert.equal(status, 200);
      assert.equal((await client.request("/auth/me")).status, 200);
      assert.equal((await phone.request("/auth/me")).status, 401);
      assert.equal((await phone.request("/auth/refresh", { method: "POST" })).status, 401);
      assert.equal((await login(app.client(), "admin@routly.dev", "nueva-5678")).status, 200);

      // La deja como estaba para el resto de tests
      await client.request("/auth/password", { method: "PATCH", body: { currentPassword: "nueva-5678", newPassword: PASSWORD } });
    });

    it("con la contraseña actual incorrecta, 400 y no cambia nada", async () => {
      await login(client);
      const { status, body } = await client.request("/auth/password", {
        method: "PATCH",
        body: { currentPassword: "otra-1234", newPassword: "nueva-5678" },
      });
      assert.equal(status, 400);
      assert.deepEqual(body.details, [{ field: "currentPassword", message: "currentPassword is incorrect" }]);
      assert.equal((await client.request("/auth/me")).status, 200);
    });

    it("la nueva tiene que ser distinta y cumplir las reglas", async () => {
      await login(client);
      const same = await client.request("/auth/password", { method: "PATCH", body: { currentPassword: PASSWORD, newPassword: PASSWORD } });
      assert.equal(same.status, 400);
      const weak = await client.request("/auth/password", { method: "PATCH", body: { currentPassword: PASSWORD, newPassword: "corta" } });
      assert.equal(weak.status, 400);
    });
  });

  describe("GET /auth/me", () => {
    it("sin sesión, 401; con un token que no es un JWT, 401 TOKEN_INVALID", async () => {
      assert.equal((await client.request("/auth/me")).status, 401);
      const { status, body, headers } = await client.request("/auth/me", { headers: { authorization: "Bearer nada" } });
      assert.equal(status, 401);
      assert.equal(body.code, "TOKEN_INVALID");
      assert.equal(headers.get("www-authenticate"), 'Bearer error="invalid_token"');
    });

    it("un usuario eliminado desde el panel pierde la sesión al momento", async () => {
      const { body } = await login(client, "admin@routly.dev");
      const admin = app.db.users.find((u) => u._id === body.user.id);
      admin.deletedAt = new Date();
      try {
        assert.equal((await client.request("/auth/me")).status, 401);
      } finally {
        admin.deletedAt = null;
      }
    });
  });
});
