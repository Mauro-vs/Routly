import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { Departure } from "../models/departure.model.js";
import { Experience } from "../models/experience.model.js";
import { Route } from "../models/route.model.js";
import { DAY, fieldMessage, fromNow, planStages, seedBasics, startApi } from "./app.js";

// Lo que usa la web pública (Home, Shop y detalle de una experiencia), sin sesión salvo que
// se diga: los filtros de experiencias que miran su ruta y sus salidas.
let api;
let data;
let costa;
let tarragona;
let costaRoute;
let deltaRoute;
let costaExperience;
let deltaExperience;

const HOUR = 60 * 60 * 1000;
const titles = (response) => response.body.map((experience) => experience.title).sort();

async function departure(experienceId, inDays, price) {
  const response = await api.post("/departures", {
    experienceId,
    startAt: fromNow(inDays * DAY),
    endAt: fromNow(inDays * DAY + 8 * HOUR),
    capacity: 6,
    price,
  });
  return response.body;
}

before(async () => {
  api = await startApi("public");
  // seedBasics: "Pirineo en moto" sobre "Valle de Tena" (medium, Montaña, Jaca → Jaca), con una
  // salida dentro de 7 días a 120 €
  data = await seedBasics(api);
  costa = (await api.post("/categories", { name: "Costa" })).body;
  tarragona = (await api.post("/locations", { city: "Tarragona", country: "España" })).body;

  const route = async (title, difficulty, categoryId, startLocationId, endLocationId) =>
    (await api.post("/routes", { title, difficulty, distance: 120, duration: 3, categoryId, startLocationId, endLocationId })).body;
  costaRoute = await route("Costa Dorada", "easy", costa._id, data.location._id, tarragona._id);
  deltaRoute = await route("Delta del Ebro", "hard", costa._id, tarragona._id, tarragona._id);

  const experience = async (title, routeId) =>
    (await api.post("/experiences", { hostId: data.host._id, routeId, title, duration: 6, maxParticipants: 10 })).body;
  costaExperience = await experience("Costa en moto", costaRoute._id);
  deltaExperience = await experience("Delta salvaje", deltaRoute._id);

  // Costa en moto: una barata pronto, una cara dentro de dos meses y una barata cancelada
  await departure(costaExperience._id, 10, 80);
  await departure(costaExperience._id, 60, 400);
  const cancelled = await departure(costaExperience._id, 20, 50);
  await api.patch(`/departures/${cancelled._id}`, { state: "cancelled" });
  // Delta salvaje: sin salidas
});
after(() => api?.stop());

describe("filtros de experiencias por su ruta", () => {
  test("categoryId: las experiencias cuya ruta es de esa categoría", async () => {
    assert.deepEqual(titles(await api.anonymous.get(`/experiences?categoryId=${costa._id}`)), ["Costa en moto", "Delta salvaje"]);
    assert.deepEqual(titles(await api.anonymous.get(`/experiences?categoryId=${data.category._id}`)), ["Pirineo en moto"]);
  });

  test("locationId: su ruta empieza o acaba en esa ubicación", async () => {
    // Jaca: origen de Costa Dorada y origen y destino de Valle de Tena
    assert.deepEqual(titles(await api.anonymous.get(`/experiences?locationId=${data.location._id}`)), ["Costa en moto", "Pirineo en moto"]);
    // Tarragona: destino de Costa Dorada, origen y destino del Delta
    assert.deepEqual(titles(await api.anonymous.get(`/experiences?locationId=${tarragona._id}`)), ["Costa en moto", "Delta salvaje"]);
  });

  test("difficulty: la de su ruta", async () => {
    assert.deepEqual(titles(await api.anonymous.get("/experiences?difficulty=hard")), ["Delta salvaje"]);
  });

  test("varios filtros de la ruta se cumplen en la misma ruta", async () => {
    const response = await api.anonymous.get(`/experiences?categoryId=${costa._id}&locationId=${data.location._id}`);
    assert.deepEqual(titles(response), ["Costa en moto"]);
    assert.deepEqual((await api.anonymous.get(`/experiences?categoryId=${costa._id}&difficulty=medium`)).body, []);
  });

  test("una categoría sin rutas, o que no existe, da una lista vacía", async () => {
    const empty = (await api.post("/categories", { name: "Desierto" })).body;
    assert.deepEqual((await api.anonymous.get(`/experiences?categoryId=${empty._id}`)).body, []);
    assert.deepEqual((await api.anonymous.get("/experiences?categoryId=6710a1b2c3d4e5f6a7b8c900")).body, []);
  });
});

describe("filtros de experiencias por sus salidas", () => {
  test("hasDepartures=true: solo las que tienen alguna salida reservable", async () => {
    assert.deepEqual(titles(await api.anonymous.get("/experiences?hasDepartures=true")), ["Costa en moto", "Pirineo en moto"]);
    const notTrue = await api.anonymous.get("/experiences?hasDepartures=false");
    assert.equal(notTrue.status, 400);
  });

  test("precio: el de alguna salida programada; una cancelada no cuenta", async () => {
    assert.deepEqual(titles(await api.anonymous.get("/experiences?priceMax=100")), ["Costa en moto"]);
    // La de 50 € está cancelada
    assert.deepEqual((await api.anonymous.get("/experiences?priceMax=60")).body, []);
    assert.deepEqual(titles(await api.anonymous.get("/experiences?priceMin=300")), ["Costa en moto"]);
  });

  test("fechas: alguna salida que empieza en ese periodo", async () => {
    assert.deepEqual(titles(await api.anonymous.get(`/experiences?from=${fromNow(30 * DAY)}`)), ["Costa en moto"]);
    assert.deepEqual(titles(await api.anonymous.get(`/experiences?to=${fromNow(8 * DAY)}`)), ["Pirineo en moto"]);
  });

  test("las condiciones de las salidas las cumple la misma salida", async () => {
    // Costa en moto tiene una de 80 € (en 10 días) y otra de 400 € (en 60): ninguna es barata y lejana
    assert.deepEqual((await api.anonymous.get(`/experiences?priceMax=100&from=${fromNow(30 * DAY)}`)).body, []);
    // Hasta 150 € y en el próximo mes: la de 80 € de Costa y la de 120 € de Pirineo (en 7 días)
    assert.deepEqual(titles(await api.anonymous.get(`/experiences?priceMax=150&to=${fromNow(30 * DAY)}`)), [
      "Costa en moto",
      "Pirineo en moto",
    ]);
  });

  test("una salida desactivada no cuenta", async () => {
    const extra = await departure(deltaExperience._id, 15, 90);
    assert.deepEqual(titles(await api.anonymous.get("/experiences?hasDepartures=true")), ["Costa en moto", "Delta salvaje", "Pirineo en moto"]);

    await api.patch(`/departures/${extra._id}/active`, { isActive: false });
    assert.deepEqual(titles(await api.anonymous.get("/experiences?hasDepartures=true")), ["Costa en moto", "Pirineo en moto"]);
  });

  test("rangos cruzados son un 400 en el máximo", async () => {
    assert.equal(fieldMessage(await api.anonymous.get("/experiences?priceMin=200&priceMax=100"), "priceMax"), "priceMax must be greater than or equal to priceMin");
    const crossed = await api.anonymous.get(`/experiences?from=${fromNow(30 * DAY)}&to=${fromNow(DAY)}`);
    assert.equal(fieldMessage(crossed, "to"), "to must be greater than or equal to from");
  });
});

describe("los filtros nuevos con el resto", () => {
  test("se combinan con q, los filtros de siempre y la paginación", async () => {
    const response = await api.anonymous.get(`/experiences?categoryId=${costa._id}&hasDepartures=true&q=moto&page=1&limit=10`);
    assert.deepEqual(titles(response), ["Costa en moto"]);
    assert.equal(response.headers.get("x-total-count"), "1");

    const byHost = await api.anonymous.get(`/experiences?hostId=${data.host._id}&difficulty=easy`);
    assert.deepEqual(titles(byHost), ["Costa en moto"]);
  });

  test("sin sesión, lo oculto no sale aunque cumpla el filtro", async () => {
    await api.patch(`/routes/${deltaRoute._id}/active`, { isActive: false });
    assert.deepEqual(titles(await api.anonymous.get(`/experiences?categoryId=${costa._id}`)), ["Costa en moto"]);
    // El admin sí la ve
    assert.deepEqual(titles(await api.get(`/experiences?categoryId=${costa._id}`)), ["Costa en moto", "Delta salvaje"]);
    await api.patch(`/routes/${deltaRoute._id}/active`, { isActive: true });
  });
});

describe("índices de los filtros nuevos", () => {
  async function assertUsesIndex(query) {
    const stages = await planStages(query);
    assert.ok(stages.includes("IXSCAN") && !stages.includes("COLLSCAN"), stages.join(" > "));
  }

  test("las rutas por categoría, por ubicación y por dificultad", async () => {
    await assertUsesIndex(Route.find({ categoryId: costa._id }));
    await assertUsesIndex(Route.find({ $or: [{ startLocationId: tarragona._id }, { endLocationId: tarragona._id }] }));
    await assertUsesIndex(Route.find({ difficulty: "hard" }));
  });

  test("las salidas reservables, por precio y por fecha", async () => {
    await assertUsesIndex(Departure.find({ isActive: true, state: "scheduled", startAt: { $gte: new Date() }, price: { $lte: 100 } }));
  });

  test("las experiencias de unas rutas, o con unos _id", async () => {
    await assertUsesIndex(Experience.find({ routeId: { $in: [costaRoute._id, deltaRoute._id] } }));
    await assertUsesIndex(Experience.find({ _id: { $in: [costaExperience._id] } }));
  });
});
