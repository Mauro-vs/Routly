import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Location } from "../models/location.model.js";
import { fieldMessage, sameContent, seedBasics, startApi } from "./app.js";

let api;
let data;
before(async () => {
  api = await startApi("validation");
  data = await seedBasics(api);
});
after(() => api?.stop());

const routeBody = (overrides = {}) => ({
  title: "Ruta de prueba",
  difficulty: "easy",
  distance: 10,
  duration: 2,
  categoryId: data.category._id,
  startLocationId: data.location._id,
  endLocationId: data.location._id,
  ...overrides,
});

test("un campo que no está en el esquema da 400 en ese campo", async () => {
  const response = await api.post("/categories", { name: "Desierto", color: "red" });
  assert.equal(response.status, 400);
  assert.equal(fieldMessage(response, "color"), "color is not allowed");

  const active = await api.patch(`/categories/${data.category._id}/active`, { isActive: true, extra: 1 });
  assert.equal(fieldMessage(active, "extra"), "extra is not allowed");
});

test("status no se acepta en el PATCH: se activa con /active", async () => {
  const response = await api.patch(`/routes/${data.route._id}`, { status: "inactive" });
  assert.equal(fieldMessage(response, "status"), "status is not allowed");
});

test("un PATCH sin campos da 400", async () => {
  const response = await api.patch(`/routes/${data.route._id}`, {});
  assert.equal(response.status, 400);
  assert.equal(response.body.message, "No fields to update");
});

test("null vacía un campo opcional, y no vale en uno obligatorio", async () => {
  await api.patch(`/categories/${data.category._id}`, { description: "Puertos" });
  const cleared = await api.patch(`/categories/${data.category._id}`, { description: null });
  assert.equal(cleared.status, 200);
  assert.ok(!("description" in cleared.body));

  assert.equal((await api.patch(`/categories/${data.category._id}`, { name: null })).status, 400);
});

test("las coordenadas se quitan con las dos a null, nunca con una sola", async () => {
  const one = await api.patch(`/locations/${data.location._id}`, { latitude: null });
  assert.equal(fieldMessage(one, "latitude"), "latitude and longitude must be sent together");

  const both = await api.patch(`/locations/${data.location._id}`, { latitude: null, longitude: null });
  assert.equal(both.status, 200);
  assert.equal(both.body.latitude, undefined);
  assert.equal((await Location.findById(data.location._id).lean()).coordinates, undefined);
});

test("una región vacía es «sin región» y cuenta para el duplicado", async () => {
  const created = await api.post("/locations", { city: "Huesca", region: "" });
  assert.equal(created.status, 201);
  assert.equal(created.body.region, undefined);

  const other = (await api.post("/locations", { city: "Huesca", region: "Aragón" })).body;
  const emptied = await api.patch(`/locations/${other._id}`, { region: "" });
  assert.equal(emptied.status, 409);
  assert.equal(emptied.body.message, "A location with this city, region and country already exists");
});

test("distancia y duración son mayores que 0 y tienen máximo", async () => {
  assert.equal(fieldMessage(await api.post("/routes", routeBody({ distance: 0 })), "distance"), "distance must be greater than 0");
  assert.equal(fieldMessage(await api.post("/routes", routeBody({ distance: 5001 })), "distance"), "distance must be less than or equal to 5000");
  assert.equal(fieldMessage(await api.post("/routes", routeBody({ duration: 241 })), "duration"), "duration must be less than or equal to 240");
  assert.equal(fieldMessage(await api.post("/routes", routeBody({ title: "V" })), "title"), "title must be at least 2 characters");
});

test("la contraseña necesita una letra y un número", async () => {
  const base = { name: "Eva", email: "eva@example.com" };
  for (const password of ["solotexto", "12345678"]) {
    const response = await api.post("/users", { ...base, password });
    assert.equal(fieldMessage(response, "password"), "password must contain at least one letter and one number");
  }
  assert.equal((await api.post("/users", { ...base, password: "clave1234" })).status, 201);
});

test("el idioma es de una lista cerrada", async () => {
  const experience = {
    hostId: data.host._id,
    routeId: data.route._id,
    title: "Otra experiencia",
    duration: 4,
    maxParticipants: 6,
  };
  const wrong = await api.post("/experiences", { ...experience, language: "zz" });
  assert.equal(fieldMessage(wrong, "language"), "language must be one of: es, en, fr, de, it, pt, ca, eu, gl");
  assert.equal((await api.post("/experiences", { ...experience, language: "CA" })).body.language, "ca");
});

test("las imágenes solo aceptan https", async () => {
  const image = { ownerType: "route", ownerId: data.route._id };
  assert.equal((await api.post("/images", { ...image, url: "http://example.com/a.jpg" })).status, 400);
  assert.equal((await api.post("/images", { ...image, url: "https://example.com/a.jpg" })).status, 201);
});

test("la etiqueta de un rol es única sin distinguir mayúsculas ni tildes", async () => {
  const response = await api.post("/roles", { name: "guia", label: "anfitrion" });
  assert.equal(response.status, 409);
  assert.equal(response.body.message, "A role with this label already exists");
});

test("un body de más de 50 kB da 413", async () => {
  const response = await api.post("/categories", { name: "Grande", description: "x".repeat(60000) });
  assert.equal(response.status, 413);
});

test("el PATCH, /active y /restore responden igual que el GET", async () => {
  const patched = await api.patch(`/routes/${data.route._id}`, { description: "Por el valle" });
  const got = await api.get(`/routes/${data.route._id}`);
  assert.ok(sameContent(patched.body, got.body));
  assert.equal(patched.body.category.name, "Montaña");

  const same = await api.patch(`/routes/${data.route._id}/active`, { isActive: true });
  assert.ok(sameContent(same.body, (await api.get(`/routes/${data.route._id}`)).body));

  const user = await api.patch(`/users/${data.user._id}`, { name: "Ana P." });
  assert.ok(sameContent(user.body, (await api.get(`/users/${data.user._id}`)).body));
  assert.equal(user.body.role.name, "host");
  assert.ok(!("passwordHash" in user.body));
});

test("un id con formato válido que no existe da 404; con formato inválido, 400", async () => {
  assert.equal((await api.get("/routes/aaaaaaaaaaaaaaaaaaaaaaaa")).status, 404);
  assert.equal((await api.get("/routes/no-es-un-id")).status, 400);
  assert.equal((await api.get("/no-existe")).status, 404);
});
