import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Bike } from "../models/bike.model.js";
import { Image } from "../models/image.model.js";
import { TEST_PASSWORD, fieldMessage, seedBasics, startApi } from "./app.js";

// El garaje: las motos de cada usuario
let api;
let data;
let marta;
let luis;
let martaId;
before(async () => {
  api = await startApi("bike");
  data = await seedBasics(api);
  await api.post("/users", { name: "Marta Gil", email: "marta@example.com", password: TEST_PASSWORD, roleId: data.rider._id });
  await api.post("/users", { name: "Luis Gómez", email: "luis@example.com", password: TEST_PASSWORD, roleId: data.rider._id });
  marta = await api.loginAs("marta@example.com");
  luis = await api.loginAs("luis@example.com");
  martaId = (await marta.get("/auth/me")).body._id;
});
after(() => api?.stop());

const MT07 = { brand: "Yamaha", model: "MT-07", type: "naked", year: 2021, cc: 689, hp: 73, torque: 67, weight: 184 };
const ids = (response) => response.body.map((bike) => bike._id);

// Una usuaria con su garaje vacío
async function freshRider(email) {
  await api.post("/users", { name: "Rider", email, password: TEST_PASSWORD, roleId: data.rider._id });
  return api.loginAs(email);
}

// ---------- alta y ficha ----------

test("crear una moto: es de quien la crea, la primera es la principal y el carnet lo calcula la API", async () => {
  const rider = await freshRider("primera@example.com");
  const response = await rider.post("/bikes", MT07);

  assert.equal(response.status, 201);
  assert.equal(response.body.userId, (await rider.get("/auth/me")).body._id);
  assert.equal(response.body.isPrimary, true);
  assert.equal(response.body.isPublic, true);
  assert.equal(response.body.license, "A");
  assert.match(response.body.slug, /^yamaha-mt-07-/);
  assert.equal(response.body.coverImage, null);

  const second = await rider.post("/bikes", { brand: "Honda", model: "CB125R", type: "naked", cc: 125, hp: 15 });
  assert.equal(second.body.isPrimary, false);
  assert.equal(second.body.license, "A1");
  assert.equal((await rider.post("/bikes", { brand: "Kawasaki", model: "Z400", type: "naked", cc: 399, hp: 45 })).body.license, "A2");
});

test("solo son obligatorios la marca, el modelo y el tipo; la ficha tiene sus límites", async () => {
  assert.equal((await marta.post("/bikes", { brand: "Ducati", model: "Monster", type: "naked" })).status, 201);
  for (const field of ["brand", "model", "type"]) {
    const { [field]: _, ...rest } = MT07;
    assert.equal(fieldMessage(await marta.post("/bikes", rest), field), `${field} is required`);
  }
  const nextYear = new Date().getFullYear() + 2;
  const cases = [
    [{ cc: 20 }, "cc"],
    [{ cc: 600.5 }, "cc"],
    [{ hp: 400 }, "hp"],
    [{ year: nextYear }, "year"],
    [{ type: "tractor" }, "type"],
    [{ seatHeight: 300 }, "seatHeight"],
  ];
  for (const [extra, field] of cases) {
    const response = await marta.post("/bikes", { ...MT07, ...extra });
    assert.equal(response.status, 400, field);
    assert.ok(fieldMessage(response, field), field);
  }
  // Ni matrícula ni carnet a mano
  assert.equal(fieldMessage(await marta.post("/bikes", { ...MT07, plate: "1234ABC" }), "plate"), "plate is not allowed");
  assert.equal(fieldMessage(await marta.post("/bikes", { ...MT07, license: "A1" }), "license"), "license is not allowed");
});

test("modificaciones: lista de hasta 30 que se sustituye entera en el PATCH", async () => {
  const bike = (
    await marta.post("/bikes", {
      ...MT07,
      modifications: [
        { type: "exhaust", title: "Akrapovic completo", date: "2024-05-10" },
        { type: "luggage", title: "Maletas laterales" },
      ],
    })
  ).body;
  assert.equal(bike.modifications.length, 2);
  assert.equal(bike.modifications[0].date, "2024-05-10T00:00:00.000Z");

  const replaced = await marta.patch(`/bikes/${bike._id}`, { modifications: [{ type: "suspension", title: "Muelles Hyperpro" }] });
  assert.deepEqual(replaced.body.modifications.map((mod) => mod.title), ["Muelles Hyperpro"]);

  const tooMany = Array.from({ length: 31 }, (_, i) => ({ type: "other", title: `Mod ${i}` }));
  assert.equal((await marta.patch(`/bikes/${bike._id}`, { modifications: tooMany })).status, 400);
  const future = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
  const futureMod = await marta.patch(`/bikes/${bike._id}`, { modifications: [{ type: "ecu", title: "Mapa", date: future }] });
  assert.equal(fieldMessage(futureMod, "modifications.0.date"), "date cannot be in the future");
  assert.equal((await marta.patch(`/bikes/${bike._id}`, { modifications: [{ type: "turbo", title: "X" }] })).status, 400);
});

test("al cambiar la ficha se recalcula el carnet; marca o modelo rehacen el slug sin perder el otro", async () => {
  const bike = (await marta.post("/bikes", MT07)).body;
  assert.equal((await marta.patch(`/bikes/${bike._id}`, { hp: 47 })).body.license, "A2");
  const cleared = await marta.patch(`/bikes/${bike._id}`, { hp: null });
  assert.equal(cleared.body.license, undefined);
  assert.equal(cleared.body.hp, undefined);

  const renamed = await marta.patch(`/bikes/${bike._id}`, { model: "Tracer 7" });
  assert.match(renamed.body.slug, /^yamaha-tracer-7-/);
  assert.equal((await marta.patch(`/bikes/${bike._id}`, { license: "A" })).body.details[0].message, "license cannot be changed");
  assert.equal((await marta.patch(`/bikes/${bike._id}`, { userId: martaId })).status, 400);
});

test("como mucho 10 motos por usuario", async () => {
  const rider = await freshRider("coleccionista@example.com");
  for (let i = 0; i < 10; i++) assert.equal((await rider.post("/bikes", { ...MT07, nickname: `n${i}` })).status, 201);
  const eleventh = await rider.post("/bikes", MT07);
  assert.equal(eleventh.status, 409);
  assert.equal(eleventh.body.message, "A user can have at most 10 bikes");
});

// ---------- moto principal ----------

test("solo una moto principal: marcar otra quita la anterior; al eliminarla pasa a la siguiente", async () => {
  const rider = await freshRider("principal@example.com");
  const first = (await rider.post("/bikes", MT07)).body;
  const second = (await rider.post("/bikes", { ...MT07, nickname: "Segunda" })).body;

  assert.equal((await rider.patch(`/bikes/${second._id}`, { isPrimary: true })).body.isPrimary, true);
  assert.equal((await rider.get(`/bikes/${first._id}`)).body.isPrimary, false);
  assert.equal((await rider.patch(`/bikes/${second._id}`, { isPrimary: false })).status, 400);

  await rider.patch(`/bikes/${second._id}/delete`);
  assert.equal((await rider.get(`/bikes/${first._id}`)).body.isPrimary, true);
  // Vuelve, pero ya no es la principal
  assert.equal((await rider.patch(`/bikes/${second._id}/restore`)).body.isPrimary, false);
});

// ---------- ABAC ----------

test("cada uno gestiona su garaje; el admin, todos; sin sesión, nada", async () => {
  const bike = (await marta.post("/bikes", MT07)).body;
  assert.equal((await api.anonymous.post("/bikes", MT07)).status, 401);
  assert.equal((await luis.patch(`/bikes/${bike._id}`, { km: 1 })).status, 403);
  assert.equal((await luis.patch(`/bikes/${bike._id}/delete`)).status, 403);
  assert.equal((await api.patch(`/bikes/${bike._id}`, { km: 12000 })).body.km, 12000);

  // Un usuario no crea motos para otro; el admin sí
  assert.equal((await luis.post("/bikes", { ...MT07, userId: martaId })).status, 403);
  const byAdmin = await api.post("/bikes", { ...MT07, userId: martaId });
  assert.equal(byAdmin.status, 201);
  assert.equal(byAdmin.body.userId, martaId);
});

test("las fotos de una moto: su dueño sí, otro no; la primera es la portada", async () => {
  const bike = (await marta.post("/bikes", MT07)).body;
  const photo = { ownerType: "bike", ownerId: bike._id, url: "https://x.dev/mt07.jpg", alt: "Con el Akrapovic" };
  assert.equal((await marta.post("/images", photo)).status, 201);
  assert.equal((await luis.post("/images", photo)).status, 403);
  assert.equal((await marta.get(`/bikes/${bike._id}`)).body.coverImage.url, "https://x.dev/mt07.jpg");
});

// ---------- visibilidad ----------

test("en público solo las motos públicas y activas; el dueño las ve todas en su garaje", async () => {
  const rider = await freshRider("privada@example.com");
  const visible = (await rider.post("/bikes", MT07)).body;
  const hidden = (await rider.post("/bikes", { ...MT07, isPublic: false })).body;
  const inactive = (await rider.post("/bikes", MT07)).body;
  await rider.patch(`/bikes/${inactive._id}/active`, { isActive: false });

  const publicIds = ids(await api.anonymous.get("/bikes"));
  assert.ok(publicIds.includes(visible._id));
  assert.ok(!publicIds.includes(hidden._id) && !publicIds.includes(inactive._id));
  assert.equal((await api.anonymous.get(`/bikes/${hidden._id}`)).status, 404);
  assert.equal((await luis.get(`/bikes/${hidden._id}`)).status, 404);

  // Su dueño las ve por id y en "mi garaje"; el admin, en todos los listados
  assert.equal((await rider.get(`/bikes/${hidden._id}`)).status, 200);
  assert.deepEqual(new Set(ids(await rider.get("/profile/me/bikes"))), new Set([visible._id, hidden._id, inactive._id]));
  assert.ok(ids(await api.get("/bikes")).includes(hidden._id));
});

test("un usuario desactivado: sus motos y sus fotos desaparecen del público", async () => {
  const rider = await freshRider("desactivada@example.com");
  const user = (await rider.get("/auth/me")).body;
  const bike = (await rider.post("/bikes", MT07)).body;
  const image = (await rider.post("/images", { ownerType: "bike", ownerId: bike._id, url: "https://x.dev/z.jpg" })).body;

  await api.patch(`/users/${user._id}/active`, { isActive: false });
  assert.equal((await api.anonymous.get(`/bikes/${bike._id}`)).status, 404);
  assert.equal((await api.anonymous.get(`/images/${image._id}`)).status, 404);
  assert.equal((await api.get(`/bikes/${bike._id}`)).status, 200);
});

// ---------- cascada con el usuario ----------

test("eliminar un usuario se lleva su garaje y las fotos; restaurarlo lo devuelve", async () => {
  const rider = await freshRider("cascada@example.com");
  const user = (await rider.get("/auth/me")).body;
  const bike = (await rider.post("/bikes", MT07)).body;
  await rider.post("/images", { ownerType: "bike", ownerId: bike._id, url: "https://x.dev/c.jpg" });

  assert.equal((await api.patch(`/users/${user._id}/delete`)).status, 204);
  const deletedBike = await Bike.findById(bike._id).setOptions({ withDeleted: true }).lean();
  const deletedImage = await Image.findOne({ ownerId: bike._id }).setOptions({ withDeleted: true }).lean();
  assert.ok(deletedBike.deletedAt);
  assert.equal(deletedImage.deletedAt.getTime(), deletedBike.deletedAt.getTime());
  assert.equal((await api.get(`/bikes/${bike._id}`)).status, 404);

  await api.patch(`/users/${user._id}/restore`);
  const back = await api.get(`/bikes/${bike._id}`);
  assert.equal(back.status, 200);
  assert.equal(back.body.coverImage.url, "https://x.dev/c.jpg");
});

test("profile.bikeModel ya no existe: lo sustituye el garaje", async () => {
  const response = await marta.patch("/profile/me", { profile: { bikeModel: "MT-07" } });
  assert.equal(fieldMessage(response, "profile.bikeModel"), "profile.bikeModel is not allowed");
});

// ---------- la moto del guía ----------

// Ana (seedBasics) es anfitriona de data.experience, que tiene data.departure
let ana;
async function anaBike(extra = {}) {
  ana ??= await api.loginAs("ana@example.com");
  return (await ana.post("/bikes", { brand: "BMW", model: "R 1250 GS", type: "adventure", cc: 1254, hp: 136, ...extra })).body;
}

test("la experiencia guía con una moto del anfitrión: sale en la ficha con su foto", async () => {
  const gs = await anaBike();
  await ana.post("/images", { ownerType: "bike", ownerId: gs._id, url: "https://x.dev/gs.jpg" });

  const updated = await ana.patch(`/experiences/${data.experience._id}`, { guideBikeId: gs._id });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.guideBike.brand, "BMW");
  assert.equal(updated.body.guideBike.license, "A");
  assert.equal(updated.body.guideBike.coverImage.url, "https://x.dev/gs.jpg");
  // En público también, y la salida la hereda
  assert.equal((await api.anonymous.get(`/experiences/${data.experience._id}`)).body.guideBike._id, gs._id);
  assert.equal((await api.anonymous.get(`/departures/${data.departure._id}`)).body.guideBike._id, gs._id);
  // Y el perfil de la anfitriona enseña su garaje
  assert.ok(ids({ body: (await api.anonymous.get(`/hosts/${data.host._id}`)).body.bikes }).includes(gs._id));
});

test("la moto del guía tiene que ser una moto activa y pública del anfitrión", async () => {
  const foreign = (await marta.post("/bikes", MT07)).body;
  const hidden = await anaBike({ isPublic: false });
  const inactive = await anaBike();
  await ana.patch(`/bikes/${inactive._id}/active`, { isActive: false });

  for (const bike of [foreign, hidden, inactive]) {
    const response = await ana.patch(`/experiences/${data.experience._id}`, { guideBikeId: bike._id });
    assert.equal(fieldMessage(response, "guideBikeId"), "guideBikeId must reference an active, public bike of the host");
  }
  assert.equal(fieldMessage(await ana.patch(`/experiences/${data.experience._id}`, { guideBikeId: "6710a1b2c3d4e5f6a7b8c999" }), "guideBikeId"),
    "guideBikeId must reference an active, public bike of the host");
});

test("una salida puede llevar otra moto del guía; con null vuelve a la de su experiencia", async () => {
  const gs = await anaBike();
  const tenere = await anaBike({ brand: "Yamaha", model: "Ténéré 700", cc: 689, hp: 73 });
  await ana.patch(`/experiences/${data.experience._id}`, { guideBikeId: gs._id });

  const own = await ana.patch(`/departures/${data.departure._id}`, { guideBikeId: tenere._id });
  assert.equal(own.body.guideBike._id, tenere._id);
  const foreign = (await marta.post("/bikes", MT07)).body;
  assert.equal((await ana.patch(`/departures/${data.departure._id}`, { guideBikeId: foreign._id })).status, 400);

  const back = await ana.patch(`/departures/${data.departure._id}`, { guideBikeId: null });
  assert.equal(back.body.guideBike._id, gs._id);
});

test("una moto que guía no se elimina, ni se desactiva ni se hace privada (409)", async () => {
  const gs = await anaBike();
  await ana.patch(`/experiences/${data.experience._id}`, { guideBikeId: gs._id });

  const message = "Bike is the guide bike of an active experience or an upcoming departure";
  assert.equal((await ana.patch(`/bikes/${gs._id}/delete`)).body.message, message);
  assert.equal((await ana.patch(`/bikes/${gs._id}/active`, { isActive: false })).body.message, message);
  assert.equal((await ana.patch(`/bikes/${gs._id}`, { isPublic: false })).body.message, message);
  // Editar el resto de la ficha, sí
  assert.equal((await ana.patch(`/bikes/${gs._id}`, { km: 45000 })).status, 200);

  // Libre de nuevo: ya no guía nada
  await ana.patch(`/experiences/${data.experience._id}`, { guideBikeId: null });
  assert.equal((await ana.patch(`/bikes/${gs._id}/delete`)).status, 204);
});

test("la salida futura también la bloquea, aunque la experiencia esté inactiva", async () => {
  const gs = await anaBike();
  const tenere = await anaBike({ brand: "Yamaha", model: "Ténéré 700" });
  await ana.patch(`/experiences/${data.experience._id}`, { guideBikeId: gs._id });
  await ana.patch(`/departures/${data.departure._id}`, { guideBikeId: tenere._id });
  await ana.patch(`/experiences/${data.experience._id}/active`, { isActive: false });
  try {
    assert.equal((await ana.patch(`/bikes/${tenere._id}/delete`)).status, 409);
    // La de la experiencia la hereda su salida futura... que ya lleva otra: esta sí queda libre
    assert.equal((await ana.patch(`/bikes/${gs._id}/delete`)).status, 204);
  } finally {
    await ana.patch(`/experiences/${data.experience._id}/active`, { isActive: true });
    await ana.patch(`/departures/${data.departure._id}`, { guideBikeId: null });
    await ana.patch(`/experiences/${data.experience._id}`, { guideBikeId: null });
  }
});

test("si el admin cambia el anfitrión, la moto del guía tiene que ser del nuevo", async () => {
  const gs = await anaBike();
  await ana.patch(`/experiences/${data.experience._id}`, { guideBikeId: gs._id });
  const other = (await api.post("/users", { name: "Otro Host", email: "otrohost@example.com", password: TEST_PASSWORD, roleId: data.hostRole._id })).body;
  const otherHost = (await api.post("/hosts", { userId: other._id, name: "Otro Host" })).body;

  const response = await api.patch(`/experiences/${data.experience._id}`, { hostId: otherHost._id });
  assert.equal(fieldMessage(response, "guideBikeId"), "guideBikeId must reference an active, public bike of the host");
  // Quitando la moto, sí
  assert.equal((await api.patch(`/experiences/${data.experience._id}`, { hostId: otherHost._id, guideBikeId: null })).status, 200);
  await api.patch(`/experiences/${data.experience._id}`, { hostId: data.host._id });
});

test("check:integrity quita la moto del guía si deja de valer, sin tocar la experiencia", async () => {
  const { checkIntegrity, fixIntegrity } = await import("../services/integrity.service.js");
  const { Experience } = await import("../models/experience.model.js");
  const gs = await anaBike();
  await ana.patch(`/experiences/${data.experience._id}`, { guideBikeId: gs._id });
  // Eliminada a mano, sin pasar por el service
  await Bike.updateOne({ _id: gs._id }, { deletedAt: new Date() });

  const problems = (await checkIntegrity()).filter((p) => p.id === data.experience._id);
  assert.deepEqual(problems.map((p) => p.detail), ["guideBikeId references a deleted Bike"]);
  await fixIntegrity(problems);
  const experience = await Experience.findById(data.experience._id).lean();
  assert.equal(experience.guideBikeId, undefined);
  assert.equal(experience.isActive, true);
});
