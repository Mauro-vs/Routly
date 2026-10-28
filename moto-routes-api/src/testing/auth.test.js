import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import jwt from "jsonwebtoken";
import { DAY, TEST_PASSWORD, fromNow, seedBasics, startApi } from "./app.js";

const NEED_LOGIN = "Authentication required";
const NO_PERMISSION = "You do not have permission to access this resource";

// Ana (data.user) es anfitriona con una experiencia y una salida; Luis, otro anfitrión
// con la suya; Marta, rider.
let api;
let data;
let ana;
let luis;
let marta;
let luisData;

before(async () => {
  api = await startApi("auth");
  data = await seedBasics(api);

  const luisUser = (
    await api.post("/users", { name: "Luis Gómez", email: "luis@example.com", password: TEST_PASSWORD, roleId: data.hostRole._id })
  ).body;
  const luisHost = (await api.post("/hosts", { userId: luisUser._id, name: "Luis Rutas" })).body;
  const luisExperience = (
    await api.post("/experiences", {
      hostId: luisHost._id,
      routeId: data.route._id,
      title: "Ruta de Luis",
      duration: 4,
      maxParticipants: 6,
    })
  ).body;
  luisData = { user: luisUser, host: luisHost, experience: luisExperience };

  await api.post("/users", { name: "Marta Gil", email: "marta@example.com", password: TEST_PASSWORD, roleId: data.rider._id });

  ana = await api.loginAs("ana@example.com");
  luis = await api.loginAs("luis@example.com");
  marta = await api.loginAs("marta@example.com");
});
after(() => api?.stop());

// Una petición con la cabecera Authorization tal cual
const withHeader = (authorization) =>
  fetch(`${api.base}/routes`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization },
    body: "{}",
  });

// ---------- authenticate ----------

test("sin token: 401 con el mensaje fijo y WWW-Authenticate", async () => {
  const response = await api.anonymous.post("/routes", {});

  assert.equal(response.status, 401);
  assert.equal(response.body.message, NEED_LOGIN);
  assert.equal(response.body.code, undefined);
  assert.equal(response.headers.get("www-authenticate"), "Bearer");
});

test("cabecera con otro formato: 401 TOKEN_INVALID", async () => {
  for (const header of ["Basic dXNlcjpwYXNz", "Bearer", "Bearer a.b.c d", api.token, `Token ${api.token}`]) {
    const response = await withHeader(header);
    assert.equal(response.status, 401, header);
    assert.equal((await response.json()).code, "TOKEN_INVALID");
  }
  // El esquema no distingue mayúsculas
  assert.notEqual((await withHeader(`bearer ${api.token}`)).status, 401);
});

test("token caducado: 401 TOKEN_EXPIRED", async () => {
  const { sub, tv } = jwt.decode(ana.token);
  const expired = jwt.sign({ sub, role: "host", tv, exp: Math.floor(Date.now() / 1000) - 5 }, process.env.JWT_SECRET);

  const response = await api.as(expired).patch(`/experiences/${data.experience._id}`, { duration: 6 });
  assert.equal(response.status, 401);
  assert.equal(response.body.code, "TOKEN_EXPIRED");
});

test("usuario desactivado o eliminado: su token deja de servir, también al reactivarlo", async () => {
  const user = (await api.post("/users", { name: "Temporal", email: "temp@example.com", password: TEST_PASSWORD, roleId: data.hostRole._id })).body;
  const temp = await api.loginAs("temp@example.com");
  assert.equal((await temp.post("/routes", {})).status, 403);

  await api.patch(`/users/${user._id}/active`, { isActive: false });
  assert.equal((await temp.post("/routes", {})).status, 401);
  // Al reactivarlo, el token de antes sigue sin servir (tokenVersion ha subido)
  await api.patch(`/users/${user._id}/active`, { isActive: true });
  assert.equal((await temp.post("/routes", {})).status, 401);

  const again = await api.loginAs("temp@example.com");
  await api.patch(`/users/${user._id}/delete`);
  assert.equal((await again.post("/routes", {})).status, 401);
  await api.patch(`/users/${user._id}/restore`, { isActive: true });
  assert.equal((await again.post("/routes", {})).status, 401);
});

test("cambiar la contraseña invalida los tokens anteriores (tokenVersion)", async () => {
  const user = (await api.post("/users", { name: "Cambia Clave", email: "clave@example.com", password: TEST_PASSWORD, roleId: data.rider._id })).body;
  const before = await api.loginAs("clave@example.com");

  await api.patch(`/users/${user._id}`, { password: "otraclave99" });
  const response = await before.post("/routes", {});
  assert.equal(response.status, 401);
  assert.equal(response.body.code, "TOKEN_INVALID");
  assert.equal((await (await api.loginAs("clave@example.com")).post("/routes", {})).status, 403);
});

test("el rol se lee de la base de datos: un cambio se aplica sin esperar al token", async () => {
  const user = (await api.post("/users", { name: "Pasa a Admin", email: "promo@example.com", password: TEST_PASSWORD, roleId: data.rider._id })).body;
  const promo = await api.loginAs("promo@example.com");
  assert.equal((await promo.get("/routes/deleted")).status, 403);

  await api.patch(`/users/${user._id}`, { roleId: api.adminRole._id });
  assert.equal((await promo.get("/routes/deleted")).status, 200);
});

test("tokenVersion y passwordHash no salen en las respuestas de usuarios", async () => {
  const user = (await api.get(`/users/${data.user._id}`)).body;
  assert.ok(!("tokenVersion" in user) && !("passwordHash" in user));
  assert.equal((await api.patch(`/users/${data.user._id}`, { tokenVersion: 9 })).status, 400);
});

// ---------- RBAC ----------

test("escrituras del catálogo de rutas: anónimo 401, rider y host 403, admin sí", async () => {
  const body = { name: "Desierto" };
  assert.equal((await api.anonymous.post("/categories", body)).status, 401);
  for (const client of [marta, ana]) {
    const response = await client.post("/categories", body);
    assert.equal(response.status, 403);
    assert.deepEqual(response.body, { statusCode: 403, error: "Forbidden", message: NO_PERMISSION });
  }
  assert.equal((await api.post("/categories", body)).status, 201);
});

test("la autenticación va antes que la validación: sin token, 401 y no 400", async () => {
  assert.equal((await api.anonymous.post("/routes", { title: "" })).status, 401);
  assert.equal((await api.anonymous.patch("/routes/no-es-un-id", {})).status, 401);
});

test("los GET del catálogo son públicos; inactivos y papelera, solo del admin", async () => {
  for (const path of ["/routes", "/categories", "/locations", "/experiences", "/departures", "/hosts", "/images"]) {
    assert.equal((await api.anonymous.get(path)).status, 200, path);
    assert.equal((await api.anonymous.get(`${path}/deleted`)).status, 401, path);
    assert.equal((await marta.get(`${path}/inactives`)).status, 403, path);
    assert.equal((await api.get(`${path}/deleted`)).status, 200, path);
  }
});

test("/api/users y /api/roles son solo del admin, también para leer", async () => {
  for (const path of ["/users", "/roles", `/users/${data.user._id}`]) {
    assert.equal((await api.anonymous.get(path)).status, 401, path);
    assert.equal((await marta.get(path)).status, 403, path);
    assert.equal((await ana.get(path)).status, 403, path);
    assert.equal((await api.get(path)).status, 200, path);
  }
});

// ---------- ABAC ----------

test("un anfitrión edita su experiencia (200) y no la de otro (403); el admin, cualquiera", async () => {
  assert.equal((await ana.patch(`/experiences/${data.experience._id}`, { duration: 7 })).status, 200);
  assert.equal((await ana.patch(`/experiences/${luisData.experience._id}`, { duration: 7 })).status, 403);
  assert.equal((await ana.patch(`/experiences/${luisData.experience._id}/active`, { isActive: false })).status, 403);
  assert.equal((await ana.patch(`/experiences/${luisData.experience._id}/delete`)).status, 403);
  assert.equal((await api.patch(`/experiences/${luisData.experience._id}`, { duration: 5 })).status, 200);
  assert.equal((await marta.patch(`/experiences/${data.experience._id}`, { duration: 7 })).status, 403);
});

test("un anfitrión solo crea experiencias en su perfil y no puede pasarlas a otro", async () => {
  const base = { routeId: data.route._id, title: "Nueva de Ana", duration: 3, maxParticipants: 4 };
  assert.equal((await ana.post("/experiences", { ...base, hostId: data.host._id })).status, 201);
  assert.equal((await ana.post("/experiences", { ...base, hostId: luisData.host._id })).status, 403);
  assert.equal((await ana.patch(`/experiences/${data.experience._id}`, { hostId: luisData.host._id })).status, 403);
});

test("salidas: solo las de sus experiencias", async () => {
  const departure = (start) => ({ startAt: fromNow(start), endAt: fromNow(start + DAY / 4), capacity: 4, price: 50 });

  assert.equal((await ana.post("/departures", { ...departure(30 * DAY), experienceId: data.experience._id })).status, 201);
  assert.equal((await ana.post("/departures", { ...departure(31 * DAY), experienceId: luisData.experience._id })).status, 403);
  assert.equal((await ana.patch(`/departures/${data.departure._id}`, { price: 99 })).status, 200);
  assert.equal((await luis.patch(`/departures/${data.departure._id}`, { price: 1 })).status, 403);
  assert.equal((await luis.patch(`/departures/${data.departure._id}/delete`)).status, 403);
});

test("imágenes: las de sus experiencias y su perfil sí; las de una ruta, no", async () => {
  const image = (ownerType, ownerId) => ({ ownerType, ownerId, url: "https://example.com/foto.jpg" });

  const own = await ana.post("/images", image("experience", data.experience._id));
  assert.equal(own.status, 201);
  assert.equal((await ana.post("/images", image("host", data.host._id))).status, 201);
  assert.equal((await ana.post("/images", image("experience", luisData.experience._id))).status, 403);
  assert.equal((await ana.post("/images", image("route", data.route._id))).status, 403);
  assert.equal((await luis.patch(`/images/${own.body._id}`, { alt: "Mía" })).status, 403);
  assert.equal((await ana.patch(`/images/${own.body._id}`, { alt: "Mía" })).status, 200);
  // Un dueño que no existe sigue siendo un 400, no un 403
  assert.equal((await ana.post("/images", image("experience", "6710a1b2c3d4e5f6a7b8c999"))).status, 400);
});

test("perfil de anfitrión: editar el suyo sí; el de otro, activar o eliminar, no", async () => {
  assert.equal((await ana.patch(`/hosts/${data.host._id}`, { biography: "Rutas por el Pirineo" })).status, 200);
  assert.equal((await ana.patch(`/hosts/${luisData.host._id}`, { biography: "Hackeado" })).status, 403);
  assert.equal((await ana.patch(`/hosts/${data.host._id}/active`, { isActive: false })).status, 403);
  assert.equal((await ana.post("/hosts", { userId: luisData.user._id, name: "Otro" })).status, 403);
});
