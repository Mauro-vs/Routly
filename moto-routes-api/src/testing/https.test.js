import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startApi } from "./app.js";

// La API como en producción con HTTPS: detrás de un proxy (TRUST_PROXY=1) que termina el
// HTTPS, y con la cookie Secure. Cada archivo de test es su propio proceso: estas variables
// no llegan a los demás. La configuración se lee al usarse, así que basta con fijarla aquí.
process.env.TRUST_PROXY = "1";
process.env.COOKIE_SECURE = "true";

let api;

before(async () => {
  api = await startApi("https");
});
after(() => api?.stop());

const COOKIE = "__Secure-routly_session";
// Lo que añade el proxy de https://routly.example al pasarle la petición a la API
const VIA_PROXY = { "x-forwarded-proto": "https", "x-forwarded-host": "routly.example" };

const send = (method, path, { headers = {}, body } = {}) =>
  fetch(api.base + path, {
    method,
    headers: { "content-type": "application/json", ...VIA_PROXY, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const cookie = () => `${COOKIE}=${api.token}`;

test("con Secure, la sesión es la cookie __Secure-routly_session; sin el prefijo ya no cuenta", async () => {
  assert.equal((await send("GET", "/profile/me", { headers: { cookie: cookie() } })).status, 200);

  const withoutPrefix = cookie().replace(COOKIE, "routly_session");
  assert.equal((await send("GET", "/profile/me", { headers: { cookie: withoutPrefix } })).status, 401);
});

test("detrás del proxy, un POST desde la propia web (https) pasa la comprobación del Origin", async () => {
  const response = await send("POST", "/categories", {
    headers: { cookie: cookie(), origin: "https://routly.example" },
    body: { name: "Desde la web" },
  });
  assert.equal(response.status, 201);
});

test("detrás del proxy, desde otra web sigue siendo un 403", async () => {
  const response = await send("POST", "/categories", {
    headers: { cookie: cookie(), origin: "https://otra-web.example" },
    body: { name: "Desde fuera" },
  });
  assert.equal(response.status, 403);
});
