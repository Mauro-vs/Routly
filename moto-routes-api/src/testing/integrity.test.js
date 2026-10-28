import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Category } from "../models/category.model.js";
import { Departure } from "../models/departure.model.js";
import { Experience } from "../models/experience.model.js";
import { Image } from "../models/image.model.js";
import { Route } from "../models/route.model.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { imageService } from "../services/image.service.js";
import { DAY, TEST_PASSWORD, fromNow, seedBasics, startApi } from "./app.js";

// Integridad referencial sin transacciones (MongoDB standalone): cada caso de la auditoría.
let api;
let data;
before(async () => {
  api = await startApi("integrity");
  data = await seedBasics(api);
});
after(() => api?.stop());

const withDeleted = { withDeleted: true };
const routeBody = (title, categoryId = data.category._id) => ({
  title,
  difficulty: "easy",
  distance: 10,
  duration: 1,
  categoryId,
  startLocationId: data.location._id,
  endLocationId: data.location._id,
});

// ¿Hay algún documento vivo que apunte a uno eliminado?
async function orphans(Model, field, Parent, filter = {}) {
  let count = 0;
  for (const doc of await Model.find(filter).lean()) {
    if (!(await Parent.findById(doc[field]).lean())) count++;
  }
  return count;
}

// ---------- carreras: doble comprobación ----------

test("crear una ruta mientras se elimina su categoría: 30 carreras, 0 huérfanas", async () => {
  for (let i = 0; i < 30; i++) {
    const category = (await api.post("/categories", { name: `Carrera ${i}` })).body;
    const [created, removed] = await Promise.all([
      api.post("/routes", routeBody(`Ruta carrera ${i}`, category._id)),
      api.patch(`/categories/${category._id}/delete`),
    ]);
    // Puede ganar cualquiera de las dos (o fallar las dos), pero nunca las dos a la vez
    assert.ok(!(created.status === 201 && removed.status === 204), `carrera ${i}: ${created.status}/${removed.status}`);
  }
  assert.equal(await orphans(Route, "categoryId", Category), 0);
});

test("crear una salida mientras se elimina su experiencia: 0 huérfanas", async () => {
  for (let i = 0; i < 15; i++) {
    const experience = (
      await api.post("/experiences", {
        hostId: data.host._id,
        routeId: data.route._id,
        title: `Exp carrera ${i}`,
        duration: 2,
        maxParticipants: 6,
      })
    ).body;
    await Promise.all([
      api.post("/departures", {
        experienceId: experience._id,
        startAt: fromNow((40 + i) * DAY),
        endAt: fromNow((40 + i) * DAY + DAY / 4),
        capacity: 4,
        price: 50,
      }),
      api.patch(`/experiences/${experience._id}/delete`),
    ]);
  }
  assert.equal(await orphans(Departure, "experienceId", Experience), 0);
});

test("restaurar una ruta mientras se elimina su categoría: 0 huérfanas", async () => {
  for (let i = 0; i < 15; i++) {
    const category = (await api.post("/categories", { name: `Restaurar ${i}` })).body;
    const route = (await api.post("/routes", routeBody(`Ruta restaurar ${i}`, category._id))).body;
    await api.patch(`/routes/${route._id}/delete`);
    await Promise.all([api.patch(`/routes/${route._id}/restore`), api.patch(`/categories/${category._id}/delete`)]);
  }
  assert.equal(await orphans(Route, "categoryId", Category), 0);
});

test("una carrera perdida responde con el mismo 400 que una referencia eliminada", async () => {
  const category = (await api.post("/categories", { name: "Ya eliminada" })).body;
  await api.patch(`/categories/${category._id}/delete`);
  const response = await api.post("/routes", routeBody("Tarde", category._id));
  assert.equal(response.status, 400);
  assert.equal(response.body.details[0].message, "categoryId must reference an active category");
});

// ---------- cascadas: nunca a medias ----------

test("si la cascada de imágenes falla, el dueño sigue vivo con sus imágenes", async () => {
  const category = (await api.post("/categories", { name: "Cascada rota" })).body;
  await api.post("/images", { ownerType: "category", ownerId: category._id, url: "https://x.dev/a.jpg" });

  const original = imageService.removeByOwner;
  imageService.removeByOwner = async () => {
    throw new Error("fallo simulado");
  };
  const quiet = console.error;
  console.error = () => {};
  try {
    assert.equal((await api.patch(`/categories/${category._id}/delete`)).status, 500);
  } finally {
    imageService.removeByOwner = original;
    console.error = quiet;
  }
  assert.equal((await api.get(`/categories/${category._id}`)).status, 200);
  assert.equal((await api.get(`/images?ownerType=category&ownerId=${category._id}`)).body.length, 1);
});

test("si eliminar al dueño falla después de la cascada, sus imágenes vuelven", async () => {
  const category = (await api.post("/categories", { name: "Dueño roto" })).body;
  await api.post("/images", { ownerType: "category", ownerId: category._id, url: "https://x.dev/b.jpg" });

  const original = categoryRepository.softDeleteById;
  categoryRepository.softDeleteById = async () => {
    throw new Error("fallo simulado");
  };
  const quiet = console.error;
  console.error = () => {};
  try {
    assert.equal((await api.patch(`/categories/${category._id}/delete`)).status, 500);
  } finally {
    categoryRepository.softDeleteById = original;
    console.error = quiet;
  }
  const images = await Image.find({ ownerType: "category", ownerId: category._id }).setOptions(withDeleted).lean();
  assert.equal(images.length, 1);
  assert.equal(images[0].deletedAt, null);
});

test("eliminar un dueño marca a la vez las imágenes y al dueño, con el mismo deletedAt", async () => {
  const category = (await api.post("/categories", { name: "Mismo instante" })).body;
  await api.post("/images", { ownerType: "category", ownerId: category._id, url: "https://x.dev/c.jpg" });
  await api.patch(`/categories/${category._id}/delete`);

  const owner = await Category.findById(category._id).setOptions(withDeleted).lean();
  const image = await Image.findOne({ ownerType: "category", ownerId: category._id }).setOptions(withDeleted).lean();
  assert.equal(image.deletedAt.getTime(), owner.deletedAt.getTime());
});

// ---------- galería de un dueño eliminado ----------

test("la galería de un dueño eliminado es un 404; la de uno inactivo, no", async () => {
  const category = (await api.post("/categories", { name: "Galería" })).body;
  await api.post("/images", { ownerType: "category", ownerId: category._id, url: "https://x.dev/d.jpg" });

  await api.patch(`/categories/${category._id}/active`, { isActive: false });
  assert.equal((await api.anonymous.get(`/images?ownerType=category&ownerId=${category._id}`)).status, 200);

  await api.patch(`/categories/${category._id}/delete`);
  const response = await api.anonymous.get(`/images?ownerType=category&ownerId=${category._id}`);
  assert.equal(response.status, 404);
  assert.equal(response.body.message, "Category not found");
  assert.equal((await api.anonymous.get("/images?ownerType=route&ownerId=6710a1b2c3d4e5f6a7b8c999")).status, 404);
});

// ---------- restaurar un anfitrión ----------

test("no se restaura un anfitrión cuyo usuario ya no tiene el rol host", async () => {
  const user = (
    await api.post("/users", { name: "Ex anfitrión", email: "exhost@example.com", password: TEST_PASSWORD, roleId: data.hostRole._id })
  ).body;
  const host = (await api.post("/hosts", { userId: user._id, name: "Ex Rutas" })).body;
  await api.patch(`/hosts/${host._id}/delete`);
  assert.equal((await api.patch(`/users/${user._id}`, { roleId: data.rider._id })).status, 200);

  const restore = await api.patch(`/hosts/${host._id}/restore`);
  assert.equal(restore.status, 409);
  assert.equal(restore.body.message, "Cannot restore: userId references a user without the host role");

  // Con el rol host de vuelta, sí
  await api.patch(`/users/${user._id}`, { roleId: data.hostRole._id });
  assert.equal((await api.patch(`/hosts/${host._id}/restore`)).status, 200);
});

// ---------- rol inactivo ----------

test("con un rol desactivado no se inicia sesión y los tokens dejan de servir", async () => {
  const role = (await api.post("/roles", { name: "guia", label: "Guía local" })).body;
  await api.post("/users", { name: "Guía", email: "guia@example.com", password: TEST_PASSWORD, roleId: role._id });
  const guide = await api.loginAs("guia@example.com");
  assert.equal((await guide.get("/auth/me")).status, 200);

  await api.patch(`/roles/${role._id}/active`, { isActive: false });
  const me = await guide.get("/auth/me");
  assert.equal(me.status, 401);
  assert.equal(me.body.code, "TOKEN_INVALID");
  const login = await api.anonymous.post("/auth/login", { email: "guia@example.com", password: TEST_PASSWORD });
  assert.equal(login.status, 401);
  assert.equal(login.body.message, "Invalid email or password");

  await api.patch(`/roles/${role._id}/active`, { isActive: true });
  assert.equal((await guide.get("/auth/me")).status, 200);
});
