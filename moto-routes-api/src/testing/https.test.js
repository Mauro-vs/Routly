import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { ADMIN_EMAIL, TEST_PASSWORD, startApi } from "./app.js";

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

async function login() {
  const response = await send("POST", "/auth/login", { body: { email: ADMIN_EMAIL, password: TEST_PASSWORD } });
  const line = response.headers.getSetCookie().find((cookie) => cookie.startsWith(`${COOKIE}=`));
  return { line, cookie: line?.split(";")[0] };
}

test("con Secure, la cookie se llama __Secure-routly_session y lleva Secure", async () => {
  const { line } = await login();

  assert.ok(line, "sin cookie __Secure-routly_session");
  assert.match(line, /; Secure/);
  assert.match(line, /HttpOnly/);
  assert.match(line, /Path=\/api/);
});

test("esa cookie es la sesión; una con el nombre sin prefijo ya no cuenta", async () => {
  const { cookie } = await login();

  assert.equal((await send("GET", "/auth/me", { headers: { cookie } })).status, 200);

  const withoutPrefix = cookie.replace(COOKIE, "routly_session");
  assert.equal((await send("GET", "/auth/me", { headers: { cookie: withoutPrefix } })).status, 401);
});

test("detrás del proxy, un POST desde la propia web (https) pasa la comprobación del Origin", async () => {
  const { cookie } = await login();

  const response = await send("POST", "/categories", {
    headers: { cookie, origin: "https://routly.example" },
    body: { name: "Desde la web" },
  });
  assert.equal(response.status, 201);
});

test("detrás del proxy, desde otra web sigue siendo un 403", async () => {
  const { cookie } = await login();

  const response = await send("POST", "/categories", {
    headers: { cookie, origin: "https://otra-web.example" },
    body: { name: "Desde fuera" },
  });
  assert.equal(response.status, 403);
});
