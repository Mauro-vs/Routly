import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { ADMIN_EMAIL, TEST_PASSWORD, seedBasics, startApi } from "./app.js";

// La sesión del panel en la cookie httpOnly (utils/session-cookie.js). El resto de tests
// usan Authorization: Bearer, que sigue funcionando igual.
let api;

before(async () => {
  api = await startApi("cookie");
  // El registro necesita el rol rider
  await seedBasics(api);
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

/** La cookie de sesión que pone una respuesta (la línea Set-Cookie entera), o undefined. */
const sessionCookieOf = (response) =>
  response.headers.getSetCookie().find((line) => line.startsWith(`${COOKIE}=`));

/** El valor de la cookie listo para mandarlo en la cabecera Cookie. */
const cookieHeader = (line) => line.split(";")[0];

const isCleared = (line) => line?.startsWith(`${COOKIE}=;`) && /Expires=Thu, 01 Jan 1970/.test(line);

async function login(email = ADMIN_EMAIL, password = TEST_PASSWORD) {
  const response = await send("POST", "/auth/login", { body: { email, password } });
  const line = sessionCookieOf(response);
  return { response, body: await response.json(), line, cookie: line && cookieHeader(line) };
}

test("el login pone la cookie httpOnly, SameSite=Strict, solo para /api y con la vida del token", async () => {
  const { response, body, line } = await login();

  assert.equal(response.status, 200);
  assert.ok(line, "sin cookie de sesión");
  assert.equal(line.split(";")[0], `${COOKIE}=${body.token}`);
  assert.match(line, /HttpOnly/);
  assert.match(line, /SameSite=Strict/);
  assert.match(line, /Path=\/api/);
  assert.match(line, new RegExp(`Max-Age=${body.expiresIn}`));
  // Fuera de producción no es Secure: en http://localhost algunos navegadores no la guardan
  assert.doesNotMatch(line, /Secure/);
  // El token sigue en el body para Swagger, Postman y los tests
  assert.equal(body.tokenType, "Bearer");
});

test("el registro también deja la sesión en la cookie", async () => {
  const response = await send("POST", "/auth/register", {
    body: { name: "Rider Cookie", email: "cookie@example.com", password: TEST_PASSWORD },
  });

  assert.equal(response.status, 201);
  assert.ok(sessionCookieOf(response));
});

test("con la cookie, sin cabecera Authorization, hay sesión", async () => {
  const { cookie } = await login();
  const response = await send("GET", "/auth/me", { headers: { cookie } });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).email, ADMIN_EMAIL);
});

test("si llegan las dos, manda la cabecera Authorization", async () => {
  const { cookie } = await login();
  const rider = await login("cookie@example.com");

  const response = await send("GET", "/auth/me", {
    headers: { cookie, authorization: `Bearer ${rider.body.token}` },
  });
  assert.equal((await response.json()).email, "cookie@example.com");
});

test("una cookie que no es un token: 401 y se borra", async () => {
  const response = await send("GET", "/auth/me", { headers: { cookie: `${COOKIE}=no-es-un-token` } });

  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "TOKEN_INVALID");
  assert.ok(isCleared(sessionCookieOf(response)));
});

test("el logout borra la cookie y esa sesión ya no sirve", async () => {
  const { cookie } = await login();

  const logout = await send("POST", "/auth/logout", { headers: { cookie, origin: "http://localhost:4200" } });
  assert.equal(logout.status, 204);
  assert.ok(isCleared(sessionCookieOf(logout)));

  const again = await send("GET", "/auth/me", { headers: { cookie } });
  assert.equal(again.status, 401);
});

test("cerrar todas las sesiones también borra la cookie", async () => {
  const rider = await login("cookie@example.com");
  const response = await send("POST", "/auth/logout-all", { headers: { cookie: rider.cookie } });

  assert.equal(response.status, 204);
  assert.ok(isCleared(sessionCookieOf(response)));
});

test("cambiar la contraseña deja una cookie nueva para seguir en esta sesión", async () => {
  await send("POST", "/auth/register", {
    body: { name: "Clave Nueva", email: "clave@example.com", password: TEST_PASSWORD },
  });
  const { cookie } = await login("clave@example.com");

  const response = await send("PATCH", "/profile/me/password", {
    headers: { cookie },
    body: { currentPassword: TEST_PASSWORD, newPassword: "otra-clave-5678" },
  });
  assert.equal(response.status, 200);
  const line = sessionCookieOf(response);
  assert.equal(cookieHeader(line), `${COOKIE}=${(await response.json()).token}`);

  // La de antes se cerró con el cambio; la nueva sirve
  assert.equal((await send("GET", "/auth/me", { headers: { cookie } })).status, 401);
  assert.equal((await send("GET", "/auth/me", { headers: { cookie: cookieHeader(line) } })).status, 200);
});

test("en las páginas públicas, una cookie que ya no sirve es anónimo y se borra", async () => {
  const { cookie } = await login();
  await send("POST", "/auth/logout", { headers: { cookie } });

  const response = await send("GET", "/categories", { headers: { cookie } });
  assert.equal(response.status, 200);
  assert.ok(isCleared(sessionCookieOf(response)));
});

test("con la cookie, cambiar datos desde otro origen es un 403 (CSRF)", async () => {
  const { cookie } = await login();

  const blocked = await send("POST", "/categories", {
    headers: { cookie, origin: "https://otra-web.example" },
    body: { name: "Desde fuera" },
  });
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).message, "Request origin not allowed");

  // Leer desde otro origen no cambia nada: no se bloquea
  const read = await send("GET", "/auth/me", { headers: { cookie, origin: "https://otra-web.example" } });
  assert.equal(read.status, 200);
});

test("con la cookie, el panel (localhost) y las peticiones sin Origin sí pueden cambiar datos", async () => {
  const { cookie } = await login();

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
