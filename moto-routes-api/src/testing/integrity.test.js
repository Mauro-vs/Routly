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

test("la galería de un dueño eliminado es un 404; la de uno inactivo, solo para el público", async () => {
  const category = (await api.post("/categories", { name: "Galería" })).body;
  await api.post("/images", { ownerType: "category", ownerId: category._id, url: "https://x.dev/d.jpg" });

  await api.patch(`/categories/${category._id}/active`, { isActive: false });
  assert.equal((await api.anonymous.get(`/images?ownerType=category&ownerId=${category._id}`)).status, 404);
  assert.equal((await api.get(`/images?ownerType=category&ownerId=${category._id}`)).status, 200);

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

// ---------- visibilidad pública: lo que cuelga de un padre inactivo ----------

const ids = (response) => (response.body ?? []).map((item) => item._id);

// Desactiva un padre, ejecuta la prueba y lo vuelve a activar pase lo que pase
async function whileInactive(path, check) {
  await api.patch(`${path}/active`, { isActive: false });
  try {
    await check();
  } finally {
    await api.patch(`${path}/active`, { isActive: true });
  }
}

test("categoría inactiva: su ruta, sus experiencias y sus salidas desaparecen del público, no del admin", async () => {
  await whileInactive(`/categories/${data.category._id}`, async () => {
    assert.ok(!ids(await api.anonymous.get("/routes")).includes(data.route._id));
    assert.equal((await api.anonymous.get(`/routes/${data.route._id}`)).status, 404);
    assert.equal((await api.anonymous.get(`/routes/slug/${data.route.slug}`)).status, 404);
    assert.ok(!ids(await api.anonymous.get("/experiences")).includes(data.experience._id));
    assert.ok(!ids(await api.anonymous.get("/departures/actives")).includes(data.departure._id));
    assert.equal((await api.anonymous.get(`/departures/sku/${data.departure.sku}`)).status, 404);

    // El admin lo sigue viendo todo
    assert.ok(ids(await api.get("/routes")).includes(data.route._id));
    assert.equal((await api.get(`/departures/${data.departure._id}`)).status, 200);
  });
  // Al reactivar la categoría, todo vuelve tal cual
  assert.equal((await api.anonymous.get(`/departures/${data.departure._id}`)).status, 200);
});

test("ubicación inactiva (origen o destino): oculta sus rutas", async () => {
  await whileInactive(`/locations/${data.location._id}`, async () => {
    assert.equal((await api.anonymous.get(`/routes/${data.route._id}`)).status, 404);
    assert.equal((await api.anonymous.get(`/experiences/${data.experience._id}`)).status, 404);
  });
});

test("usuario anfitrión desactivado: se ocultan su perfil de anfitrión, sus experiencias y sus salidas", async () => {
  await whileInactive(`/users/${data.user._id}`, async () => {
    assert.ok(!ids(await api.anonymous.get("/hosts")).includes(data.host._id));
    assert.equal((await api.anonymous.get(`/hosts/${data.host._id}`)).status, 404);
    assert.equal((await api.anonymous.get(`/experiences/${data.experience._id}`)).status, 404);
    assert.equal((await api.anonymous.get(`/departures/${data.departure._id}`)).status, 404);
    assert.ok(ids(await api.get("/hosts")).includes(data.host._id));
  });
  assert.equal((await api.anonymous.get(`/hosts/${data.host._id}`)).status, 200);
});

test("ruta o anfitrión inactivos: ocultan sus experiencias y sus salidas", async () => {
  for (const path of [`/routes/${data.route._id}`, `/hosts/${data.host._id}`]) {
    await whileInactive(path, async () => {
      assert.equal((await api.anonymous.get(`/experiences/${data.experience._id}`)).status, 404, path);
      assert.ok(!ids(await api.anonymous.get("/departures")).includes(data.departure._id), path);
    });
  }
  await whileInactive(`/experiences/${data.experience._id}`, async () => {
    assert.equal((await api.anonymous.get(`/departures/${data.departure._id}`)).status, 404);
  });
});

test("un rider o un anfitrión ven lo mismo que un anónimo; un token que no sirve es un 401", async () => {
  await api.post("/users", { name: "Rider Vis", email: "vis@example.com", password: TEST_PASSWORD, roleId: data.rider._id });
  const rider = await api.loginAs("vis@example.com");
  const host = await api.loginAs("ana@example.com");
  await whileInactive(`/categories/${data.category._id}`, async () => {
    assert.equal((await rider.get(`/routes/${data.route._id}`)).status, 404);
    assert.equal((await host.get(`/routes/${data.route._id}`)).status, 404);
  });
  assert.equal((await api.as("token-que-no-sirve.x.y").get("/routes")).status, 401);
});

test("en público tampoco se ven los inactivos, en ninguna colección del catálogo", async () => {
  const cases = [
    [`/categories/${data.category._id}`, "/categories"],
    [`/locations/${data.location._id}`, "/locations"],
    [`/routes/${data.route._id}`, "/routes"],
    [`/hosts/${data.host._id}`, "/hosts"],
    [`/experiences/${data.experience._id}`, "/experiences"],
    [`/departures/${data.departure._id}`, "/departures"],
  ];
  for (const [path, list] of cases) {
    const id = path.split("/").pop();
    await whileInactive(path, async () => {
      assert.ok(!ids(await api.anonymous.get(list)).includes(id), path);
      assert.equal((await api.anonymous.get(path)).status, 404, path);
      // El admin lo sigue viendo, también en el listado general
      assert.ok(ids(await api.get(list)).includes(id), path);
      assert.equal((await api.get(path)).status, 200, path);
    });
    assert.equal((await api.anonymous.get(path)).status, 200, `${path} al reactivar`);
  }
});

test("imágenes: en público, ni las inactivas ni las de un dueño oculto", async () => {
  const image = (await api.post("/images", { ownerType: "route", ownerId: data.route._id, url: "https://x.dev/e.jpg" })).body;

  await whileInactive(`/images/${image._id}`, async () => {
    assert.equal((await api.anonymous.get(`/images/${image._id}`)).status, 404);
    assert.ok(!ids(await api.anonymous.get(`/images?ownerType=route&ownerId=${data.route._id}`)).includes(image._id));
  });
  await whileInactive(`/categories/${data.category._id}`, async () => {
    // La ruta queda oculta, y con ella su galería y sus imágenes
    assert.equal((await api.anonymous.get(`/images?ownerType=route&ownerId=${data.route._id}`)).status, 404);
    assert.ok(!ids(await api.anonymous.get("/images")).includes(image._id));
    assert.equal((await api.anonymous.get(`/images/${image._id}`)).status, 404);
    assert.ok(ids(await api.get("/images")).includes(image._id));
  });
  assert.equal((await api.anonymous.get(`/images/${image._id}`)).status, 200);
});

// ---------- npm run check:integrity ----------

test("check:integrity detecta lo escrito por fuera de los services y repara lo que puede", async () => {
  const { checkIntegrity, fixIntegrity } = await import("../services/integrity.service.js");
  const { Profile } = await import("../models/profile.model.js");
  const { User } = await import("../models/user.model.js");
  const { Host } = await import("../models/host.model.js");
  assert.deepEqual(await checkIntegrity(), []);

  // Escrituras a mano, sin pasar por los services
  const category = (await api.post("/categories", { name: "Rota a mano" })).body;
  const route = (await api.post("/routes", routeBody("Ruta rota", category._id))).body;
  await api.post("/images", { ownerType: "category", ownerId: category._id, url: "https://x.dev/z.jpg" });
  await Category.updateOne({ _id: category._id }, { deletedAt: new Date() });
  const lonely = (await api.post("/users", { name: "Sin perfil", email: "sinperfil@example.com", password: TEST_PASSWORD })).body;
  await Profile.deleteOne({ userId: lonely._id });
  const exHost = (await api.post("/users", { name: "Sin rol", email: "sinrol@example.com", password: TEST_PASSWORD, roleId: data.hostRole._id })).body;
  const host = (await api.post("/hosts", { userId: exHost._id, name: "Sin rol" })).body;
  await User.updateOne({ _id: exHost._id }, { roleId: data.rider._id });

  const problems = await checkIntegrity();
  const details = problems.map(({ collection, detail }) => `${collection}: ${detail}`);
  assert.ok(details.includes("routes: categoryId references a deleted Category"));
  assert.ok(details.includes("images: ownerId references a deleted category"));
  assert.ok(details.includes("users: user has no profile"));
  assert.ok(details.includes("hosts: userId references a user without the host role"));

  assert.equal(await fixIntegrity(problems), problems.length - 1);
  // Solo queda lo que tiene que decidir una persona
  const pending = await checkIntegrity();
  assert.deepEqual(pending.map(({ id }) => id), [host._id]);
  assert.equal((await Route.findById(route._id).lean()).isActive, false);
  assert.equal(await Profile.countDocuments({ userId: lonely._id }), 1);

  await Host.updateOne({ _id: host._id }, { deletedAt: new Date() });
  assert.deepEqual(await checkIntegrity(), []);
});
