import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { ADMIN_EMAIL, TEST_PASSWORD, seedBasics, startApi } from "./app.js";
import { signTestToken } from "./tokens.js";

// La sesión del panel en la cookie httpOnly. La pone, la renueva y la borra el servicio de auth
// (moto-routes-auth); la API solo la lee. El resto de tests usan Authorization: Bearer.
let api;
let data;

before(async () => {
  api = await startApi("cookie");
  data = await seedBasics(api);
  await api.post("/users", { name: "Rider Cookie", email: "cookie@example.com", password: TEST_PASSWORD, roleId: data.rider._id });
});
after(() => api?.stop());

const COOKIE = "routly_session";

/** Una petición tal cual, con las cabeceras que se le pasen. */
const send = (method, path, { headers = {}, body } = {}) =>
  fetch(api.base + path, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

/** La cabecera Cookie con la sesión de un usuario, como la deja el servicio de auth. */
async function sessionCookie(email = ADMIN_EMAIL) {
  const { token } = await api.loginAs(email);
  return `${COOKIE}=${token}`;
}

test("con la cookie, sin cabecera Authorization, hay sesión", async () => {
  const response = await send("GET", "/profile/me", { headers: { cookie: await sessionCookie() } });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).email, ADMIN_EMAIL);
});

test("la API ya no pone ni borra cookies: eso es del servicio de auth", async () => {
  const ok = await send("GET", "/profile/me", { headers: { cookie: await sessionCookie() } });
  const bad = await send("GET", "/profile/me", { headers: { cookie: `${COOKIE}=no-es-un-token` } });
  assert.deepEqual(ok.headers.getSetCookie(), []);
  assert.deepEqual(bad.headers.getSetCookie(), []);
});

test("si llegan las dos, manda la cabecera Authorization", async () => {
  const rider = await api.loginAs("cookie@example.com");

  const response = await send("GET", "/profile/me", {
    headers: { cookie: await sessionCookie(), authorization: `Bearer ${rider.token}` },
  });
  assert.equal((await response.json()).email, "cookie@example.com");
});

test("una cookie que no es un token: 401 TOKEN_INVALID", async () => {
  const response = await send("GET", "/profile/me", { headers: { cookie: `${COOKIE}=no-es-un-token` } });

  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "TOKEN_INVALID");
});

test("una cookie caducada: 401 TOKEN_EXPIRED, para que el panel la renueve con /auth/refresh", async () => {
  const user = (await api.get("/profile/me")).body;
  const expired = await signTestToken({ _id: user._id, role: "admin" }, { expiresIn: -60 });

  const response = await send("GET", "/profile/me", { headers: { cookie: `${COOKIE}=${expired}` } });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "TOKEN_EXPIRED");
});

test("en las páginas públicas, una cookie que ya no sirve es anónimo", async () => {
  const response = await send("GET", "/categories", { headers: { cookie: `${COOKIE}=no-es-un-token` } });
  assert.equal(response.status, 200);
});

test("con la cookie, cambiar datos desde otro origen es un 403 (CSRF)", async () => {
  const cookie = await sessionCookie();

  const blocked = await send("POST", "/categories", {
    headers: { cookie, origin: "https://otra-web.example" },
    body: { name: "Desde fuera" },
  });
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).message, "Request origin not allowed");

  // Leer desde otro origen no cambia nada: no se bloquea
  const read = await send("GET", "/profile/me", { headers: { cookie, origin: "https://otra-web.example" } });
  assert.equal(read.status, 200);
});

test("con la cookie, el panel (localhost) y las peticiones sin Origin sí pueden cambiar datos", async () => {
  const cookie = await sessionCookie();

  const fromPanel = await send("POST", "/categories", {
    headers: { cookie, origin: "http://localhost:4200" },
    body: { name: "Desde el panel" },
  });
  assert.equal(fromPanel.status, 201);

  const noOrigin = await send("POST", "/categories", { headers: { cookie }, body: { name: "Sin origen" } });
  assert.equal(noOrigin.status, 201);
});

test("con la cabecera Authorization no se mira el Origin: no viaja sola como la cookie", async () => {
  const response = await send("POST", "/categories", {
    headers: { authorization: `Bearer ${api.token}`, origin: "https://otra-web.example" },
    body: { name: "Con cabecera" },
  });
  assert.equal(response.status, 201);
});

test("sin TRUST_PROXY, las cabeceras X-Forwarded-* no cuentan para el Origin", async () => {
  // Un cliente cualquiera puede mandarlas: sin un proxy de confianza, no se cree que sea https
  const response = await send("POST", "/categories", {
    headers: {
      cookie: await sessionCookie(),
      origin: "https://routly.example",
      "x-forwarded-proto": "https",
      "x-forwarded-host": "routly.example",
    },
    body: { name: "Origen inventado" },
  });
  assert.equal(response.status, 403);
});
