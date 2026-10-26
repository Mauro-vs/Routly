import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Image } from "../models/image.model.js";
import { Route } from "../models/route.model.js";
import { seedBasics, startApi } from "./app.js";

let api;
let data;
before(async () => {
  api = await startApi("softdelete");
  data = await seedBasics(api);
});
after(() => api?.stop());

// Una ruta sin experiencias, que se puede eliminar
async function freeRoute(title) {
  const { body } = await api.post("/routes", {
    title,
    difficulty: "easy",
    distance: 10,
    duration: 1,
    categoryId: data.category._id,
    startLocationId: data.location._id,
    endLocationId: data.location._id,
  });
  return body;
}

test("eliminar solo marca deletedAt: el documento conserva su estado", async () => {
  const route = await freeRoute("Ruta a eliminar");
  assert.equal((await api.patch(`/routes/${route._id}/delete`)).status, 204);

  const stored = await Route.findById(route._id).setOptions({ withDeleted: true }).lean();
  assert.ok(stored.deletedAt);
  assert.equal(stored.status, "active");
  assert.equal(stored.isActive, true);
});

test("un eliminado no aparece en los listados ni por id, y sí en la papelera", async () => {
  const route = await freeRoute("Ruta oculta");
  await api.patch(`/routes/${route._id}/delete`);

  const ids = (response) => response.body.map((item) => item._id);
  assert.ok(!ids(await api.get("/routes")).includes(route._id));
  assert.ok(!ids(await api.get("/routes/actives")).includes(route._id));
  assert.ok(ids(await api.get("/routes/deleted")).includes(route._id));
  assert.equal((await api.get(`/routes/${route._id}`)).status, 404);
  assert.equal((await api.patch(`/routes/${route._id}`, { title: "Xx" })).status, 404);
  assert.equal((await api.patch(`/routes/${route._id}/delete`)).status, 404);
});

test("restaurar sin isActive vuelve como estaba; con isActive se fuerza", async () => {
  const route = await freeRoute("Ruta inactiva");
  await api.patch(`/routes/${route._id}/active`, { isActive: false });
  await api.patch(`/routes/${route._id}/delete`);

  const back = await api.patch(`/routes/${route._id}/restore`);
  assert.equal(back.status, 200);
  assert.equal(back.body.status, "inactive");

  await api.patch(`/routes/${route._id}/delete`);
  const forced = await api.patch(`/routes/${route._id}/restore`, { isActive: true });
  assert.equal(forced.body.status, "active");
  assert.equal(forced.body.isActive, true);

  const again = await api.patch(`/routes/${route._id}/restore`);
  assert.equal(again.status, 409);
  assert.equal(again.body.message, "Route is not deleted");
});

test("las imágenes se eliminan y se restauran con su dueño, tal como estaban", async () => {
  const route = await freeRoute("Ruta con fotos");
  const cover = (await api.post("/images", { ownerType: "route", ownerId: route._id, url: "https://example.com/1.jpg" })).body;
  const other = (await api.post("/images", { ownerType: "route", ownerId: route._id, url: "https://example.com/2.jpg" })).body;
  await api.patch(`/images/${other._id}/active`, { isActive: false });

  await api.patch(`/routes/${route._id}/delete`);
  assert.equal((await Image.find({ ownerId: route._id }).lean()).length, 0);

  await api.patch(`/routes/${route._id}/restore`);
  const images = await Image.find({ ownerId: route._id }).lean();
  const byId = (id) => images.find((image) => String(image._id) === id);
  assert.equal(byId(cover._id).isCover, true);
  assert.equal(byId(cover._id).status, "active");
  assert.equal(byId(other._id).status, "inactive");
  assert.equal(byId(other._id).isCover, false);
});

test("una imagen eliminada a mano no vuelve con su dueño", async () => {
  const route = await freeRoute("Ruta con una foto borrada");
  const image = (await api.post("/images", { ownerType: "route", ownerId: route._id, url: "https://example.com/3.jpg" })).body;
  await api.patch(`/images/${image._id}/delete`);
  await api.patch(`/routes/${route._id}/delete`);
  await api.patch(`/routes/${route._id}/restore`);

  assert.equal((await api.get(`/images/${image._id}`)).status, 404);
});

test("no se elimina nada con dependientes, y no se restaura con una referencia eliminada", async () => {
  const blocked = await api.patch(`/categories/${data.category._id}/delete`);
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.message, "Cannot delete a category that has routes");

  const category = (await api.post("/categories", { name: "Temporal" })).body;
  const route = (await api.post("/routes", {
    title: "Ruta temporal",
    difficulty: "easy",
    distance: 5,
    duration: 1,
    categoryId: category._id,
    startLocationId: data.location._id,
    endLocationId: data.location._id,
  })).body;
  await api.patch(`/routes/${route._id}/delete`);
  await api.patch(`/categories/${category._id}/delete`);

  const restore = await api.patch(`/routes/${route._id}/restore`);
  assert.equal(restore.status, 409);
  assert.equal(restore.body.message, "Cannot restore: categoryId references a deleted category");
});

test("un duplicado que está en la papelera lo dice", async () => {
  const category = (await api.post("/categories", { name: "Costa" })).body;
  await api.patch(`/categories/${category._id}/delete`);

  const trashed = await api.post("/categories", { name: "cósta" });
  assert.equal(trashed.status, 409);
  assert.equal(trashed.body.message, "A category with this name already exists in the trash");

  const alive = await api.post("/categories", { name: "MONTAÑA" });
  assert.equal(alive.body.message, "A category with this name already exists");
});

test("los roles base no se pueden desactivar ni eliminar", async () => {
  // El seed los marca con isSystem; aquí se hace directamente en la base de datos
  const { Role } = await import("../models/role.model.js");
  await Role.updateOne({ _id: data.rider._id }, { isSystem: true });

  assert.equal((await api.patch(`/roles/${data.rider._id}/active`, { isActive: false })).body.message, "System roles cannot be deactivated");
  assert.equal((await api.patch(`/roles/${data.rider._id}/delete`)).body.message, "System roles cannot be deleted");
});
