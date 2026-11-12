import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import mongoose from "mongoose";
import { Departure } from "../models/departure.model.js";
import { Experience } from "../models/experience.model.js";
import { DAY, fieldMessage, fromNow, planStages, seedBasics, startApi } from "./app.js";

// La tienda pública (/api/shop): los carruseles del Home, el Shop y el detalle con sus salidas.
// Sin sesión salvo que se diga: con la del admin se tiene que ver lo mismo.
let api;
let data;
let costa;
let tarragona;
let deltaRoute;
let costaExperience;
let deltaExperience;

const HOUR = 60 * 60 * 1000;
const shop = (path) => api.anonymous.get(`/shop${path}`);
// Los títulos del Shop, en el orden en que llegan
const titles = (response) => response.body.data.map((experience) => experience.title);

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
  api = await startApi("shop");
  // seedBasics: "Pirineo en moto" (Ana Rutas) sobre "Valle de Tena" (medium, Montaña, Jaca → Jaca),
  // con una salida dentro de 7 días a 120 €
  data = await seedBasics(api);
  costa = (await api.post("/categories", { name: "Costa" })).body;
  tarragona = (await api.post("/locations", { city: "Tarragona", country: "España" })).body;

  const route = async (title, difficulty, categoryId, startLocationId, endLocationId) =>
    (await api.post("/routes", { title, difficulty, distance: 120, duration: 3, categoryId, startLocationId, endLocationId })).body;
  const costaRoute = await route("Costa Dorada", "easy", costa._id, data.location._id, tarragona._id);
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

  // La galería de Costa en moto, en otro orden del de alta
  await api.post("/images", { ownerType: "experience", ownerId: costaExperience._id, url: "https://picsum.photos/seed/b/800/600", alt: "Segunda", position: 1 });
  await api.post("/images", { ownerType: "experience", ownerId: costaExperience._id, url: "https://picsum.photos/seed/a/800/600", alt: "Primera", position: 0 });
});
after(() => api?.stop());

describe("los carruseles del Home", () => {
  // Nombre (o ciudad) y cuántas experiencias tiene, en el orden en que llegan
  const summary = (items, label = "name") => items.map((item) => `${item[label]}: ${item.experienceCount}`);

  test("solo lo que tiene experiencias visibles, con cuántas, de más a menos, en { data }", async () => {
    const categories = await shop("/categories");
    assert.equal(categories.status, 200);
    // Costa: Costa en moto y Delta salvaje. Montaña: Pirineo en moto
    assert.deepEqual(summary(categories.body.data), ["Costa: 2", "Montaña: 1"]);
    assert.deepEqual(summary((await shop("/hosts")).body.data), ["Ana Rutas: 3"]);
    // Una ruta que empieza y acaba en Jaca cuenta una vez; empatadas, por ciudad
    assert.deepEqual(summary((await shop("/locations")).body.data, "city"), ["Jaca: 2", "Tarragona: 2"]);
  });

  test("lo que pide cada tarjeta: slug y foto; el anfitrión, sin el email de su usuario", async () => {
    const [category] = (await shop("/categories")).body.data;
    const [host] = (await shop("/hosts")).body.data;
    const [location] = (await shop("/locations")).body.data;

    assert.ok(category.slug && "coverImage" in category);
    assert.ok(host.slug && "coverImage" in host);
    assert.deepEqual(Object.keys(host.user).sort(), ["_id", "name"]);
    assert.ok(location.slug && "coverImage" in location);
  });

  test("una experiencia oculta no cuenta", async () => {
    await api.patch(`/routes/${deltaRoute._id}/active`, { isActive: false });
    const categories = (await shop("/categories")).body.data;
    const locations = (await shop("/locations")).body.data;
    await api.patch(`/routes/${deltaRoute._id}/active`, { isActive: true });

    assert.deepEqual(summary(categories), ["Costa: 1", "Montaña: 1"]);
    assert.deepEqual(summary(locations, "city"), ["Jaca: 2", "Tarragona: 1"]);
  });

  test("limit corta la lista; un limit no válido o un parámetro de más es un 400", async () => {
    assert.deepEqual(summary((await shop("/categories?limit=1")).body.data), ["Costa: 2"]);
    assert.equal((await shop("/hosts?limit=0")).status, 400);
    assert.equal((await shop("/locations?limit=51")).status, 400);
    assert.equal(fieldMessage(await shop("/categories?q=moto"), "q"), "q is not allowed");
  });

  test("/experiences/facets ya no existe: lo sustituyen los carruseles", async () => {
    assert.equal((await api.anonymous.get("/experiences/facets")).status, 400);
  });
});

describe("el Shop", () => {
  test("una página en { data, pagination }, de las más recientes a las más antiguas", async () => {
    const response = await shop("/experiences");

    assert.equal(response.status, 200);
    assert.deepEqual(titles(response), ["Delta salvaje", "Costa en moto", "Pirineo en moto"]);
    assert.deepEqual(response.body.pagination, { total: 3, page: 1, limit: 12, totalPages: 1 });
    // Lo de la tarjeta
    const costaCard = response.body.data.find((experience) => experience.title === "Costa en moto");
    assert.equal(costaCard.route.category.name, "Costa");
    assert.equal(costaCard.route.startLocation.city, "Jaca");
    assert.equal(costaCard.host.name, "Ana Rutas");
    assert.equal(costaCard.priceFrom, 80);
    assert.ok(costaCard.nextDepartureAt);
    assert.equal(costaCard.coverImage.alt, "Segunda");
  });

  test("páginas: limit y page, con el total de lo filtrado", async () => {
    const second = await shop("/experiences?limit=2&page=2");
    assert.deepEqual(titles(second), ["Pirineo en moto"]);
    assert.deepEqual(second.body.pagination, { total: 3, page: 2, limit: 2, totalPages: 2 });
    assert.deepEqual((await shop("/experiences?limit=2&page=5")).body.data, []);
  });

  test("por categoría, anfitrión y ubicación (de origen o de destino), por slug", async () => {
    assert.deepEqual(titles(await shop(`/experiences?category=${costa.slug}`)).sort(), ["Costa en moto", "Delta salvaje"]);
    assert.equal((await shop(`/experiences?host=${data.host.slug}`)).body.pagination.total, 3);
    // Costa Dorada empieza en Jaca y acaba en Tarragona: sale en las dos
    assert.deepEqual(titles(await shop(`/experiences?location=${tarragona.slug}`)).sort(), ["Costa en moto", "Delta salvaje"]);
    assert.deepEqual(titles(await shop(`/experiences?location=${data.location.slug}`)).sort(), ["Costa en moto", "Pirineo en moto"]);
    assert.deepEqual(titles(await shop(`/experiences?category=${costa.slug}&location=${data.location.slug}`)), ["Costa en moto"]);
  });

  test("un slug que no existe deja el Shop vacío, sin error", async () => {
    const response = await shop("/experiences?category=no-existe");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { data: [], pagination: { total: 0, page: 1, limit: 12, totalPages: 0 } });
  });

  test("search: palabras del título o la descripción, sin mayúsculas ni acentos, con el índice de texto", async () => {
    assert.deepEqual(titles(await shop("/experiences?search=COSTA")), ["Costa en moto"]);
    // "en" no cuenta (palabra vacía en español): busca "moto"
    assert.deepEqual(titles(await shop("/experiences?search=en%20moto")).sort(), ["Costa en moto", "Pirineo en moto"]);
    // Sus variantes: "salvajes" encuentra "salvaje"
    assert.deepEqual(titles(await shop("/experiences?search=salvajes")), ["Delta salvaje"]);
    // También la descripción, y sin acentos
    await api.patch(`/experiences/${deltaExperience._id}`, { description: "Arrozales y flamencos en la desembocadura." });
    assert.deepEqual(titles(await shop("/experiences?search=desembocadura")), ["Delta salvaje"]);
    assert.deepEqual(titles(await shop("/experiences?search=DESEMBOCADURÁ")), ["Delta salvaje"]);
    // Los caracteres especiales no son una expresión regular
    assert.deepEqual((await shop("/experiences?search=.*")).body.data, []);
    // Vacío, sin buscar
    assert.equal((await shop("/experiences?search=")).body.pagination.total, 3);
  });

  test("search sin sort: las que mejor encajan primero; con sort, el pedido", async () => {
    // "moto" sale dos veces en la de la descripción: encaja mejor que la otra
    await api.patch(`/experiences/${data.experience._id}`, { description: "Moto, moto y más moto por el Pirineo." });
    assert.deepEqual(titles(await shop("/experiences?search=moto")), ["Pirineo en moto", "Costa en moto"]);
    assert.deepEqual(titles(await shop("/experiences?search=moto&sort=title")), ["Costa en moto", "Pirineo en moto"]);
  });

  test("ordenar por precio con un filtro por slug de anfitrión (los ids llegan como texto)", async () => {
    assert.deepEqual(titles(await shop(`/experiences?host=${data.host.slug}&sort=priceFrom`)), [
      "Costa en moto",
      "Pirineo en moto",
      "Delta salvaje",
    ]);
    const page = await shop(`/experiences?host=${data.host.slug}&sort=-priceFrom&limit=1&page=2`);
    // Sin salidas va al final también en descendente: la segunda es la de 80 €
    assert.deepEqual(titles(page), ["Costa en moto"]);
    assert.equal(page.body.pagination.total, 3);
  });

  test("los filtros y órdenes de las experiencias", async () => {
    assert.deepEqual(titles(await shop("/experiences?sort=priceFrom")), ["Costa en moto", "Pirineo en moto", "Delta salvaje"]);
    assert.deepEqual(titles(await shop("/experiences?priceMax=100")), ["Costa en moto"]);
    assert.deepEqual(titles(await shop("/experiences?difficulty=hard")), ["Delta salvaje"]);
    assert.deepEqual(titles(await shop("/experiences?hasDepartures=true&sort=title")), ["Costa en moto", "Pirineo en moto"]);
  });

  test("lo que no vale es un 400 con el formato de siempre", async () => {
    assert.equal(fieldMessage(await shop("/experiences?categoryId=x"), "categoryId"), "categoryId is not allowed");
    assert.equal((await shop("/experiences?limit=51")).status, 400);
    assert.equal((await shop("/experiences?page=0")).status, 400);
    assert.equal((await shop("/experiences?category=No%20Vale")).status, 400);
    assert.equal(fieldMessage(await shop("/experiences?sort=price"), "sort"), "sort must be a comma-separated list of: title, priceFrom, nextDepartureAt, createdAt");
    assert.equal(fieldMessage(await shop("/experiences?priceMin=200&priceMax=100"), "priceMax"), "priceMax must be greater than or equal to priceMin");
  });

  test("con la sesión del admin se ve lo mismo: lo inactivo no sale", async () => {
    await api.patch(`/experiences/${deltaExperience._id}/active`, { isActive: false });
    const asAdmin = await api.get("/shop/experiences");
    await api.patch(`/experiences/${deltaExperience._id}/active`, { isActive: true });

    assert.deepEqual(titles(asAdmin), ["Costa en moto", "Pirineo en moto"]);
  });
});

describe("el detalle", () => {
  test("la experiencia con su anfitrión entero y su galería, por posición, en { data }", async () => {
    await api.patch(`/hosts/${data.host._id}`, { biography: "Guía en el Pirineo desde 2010." });
    const response = await shop(`/experiences/${costaExperience.slug}`);

    assert.equal(response.status, 200);
    const experience = response.body.data;
    assert.equal(experience.title, "Costa en moto");
    assert.equal(experience.host.biography, "Guía en el Pirineo desde 2010.");
    assert.deepEqual(Object.keys(experience.host.user).sort(), ["_id", "name"]);
    assert.equal(experience.route.endLocation.city, "Tarragona");
    assert.deepEqual(experience.images.map((image) => image.alt), ["Primera", "Segunda"]);
  });

  test("una experiencia que no existe o no se ve es un 404", async () => {
    assert.equal((await shop("/experiences/no-existe")).status, 404);

    await api.patch(`/routes/${deltaRoute._id}/active`, { isActive: false });
    const hidden = await shop(`/experiences/${deltaExperience.slug}`);
    const hiddenDepartures = await shop(`/experiences/${deltaExperience.slug}/departures`);
    await api.patch(`/routes/${deltaRoute._id}/active`, { isActive: true });

    assert.equal(hidden.status, 404);
    assert.equal(hiddenDepartures.status, 404);
  });

  test("sus salidas: las reservables, de la más próxima a la más lejana, con las plazas libres", async () => {
    const response = await shop(`/experiences/${costaExperience.slug}/departures`);

    assert.equal(response.status, 200);
    // La cancelada no sale
    assert.deepEqual(response.body.data.map((departure) => departure.price), [80, 400]);
    for (const departure of response.body.data) {
      assert.equal(departure.state, "scheduled");
      assert.equal(departure.seatsLeft, departure.capacity);
      assert.ok(departure.startAt && departure.endAt);
    }
    assert.deepEqual((await shop(`/experiences/${deltaExperience.slug}/departures`)).body.data, []);
  });

  test("una salida completa sale marcada, pero no cuenta para el precio desde ni para hasDepartures", async () => {
    // Delta salvaje: una sola salida, y se llena (aún no hay reservas: se escribe a mano)
    const full = await departure(deltaExperience._id, 15, 30);
    await Departure.updateOne({ _id: full._id }, { seatsBooked: 6 });
    try {
      const [listed] = (await shop(`/experiences/${deltaExperience.slug}/departures`)).body.data;
      assert.deepEqual([listed.seatsBooked, listed.seatsLeft, listed.isFull], [6, 0, true]);

      const delta = (await shop(`/experiences/${deltaExperience.slug}`)).body.data;
      assert.equal(delta.priceFrom, null);
      assert.ok(!titles(await shop("/experiences?hasDepartures=true")).includes("Delta salvaje"));

      // Con una plaza libre vuelve a contar
      await Departure.updateOne({ _id: full._id }, { seatsBooked: 5 });
      const [freed] = (await shop(`/experiences/${deltaExperience.slug}/departures`)).body.data;
      assert.deepEqual([freed.seatsLeft, freed.isFull], [1, false]);
      assert.equal((await shop(`/experiences/${deltaExperience.slug}`)).body.data.priceFrom, 30);
    } finally {
      await Departure.deleteOne({ _id: full._id });
    }
  });
});

describe("rendimiento", () => {
  test("la búsqueda del Shop usa el índice de texto, no recorre la colección", async () => {
    const stages = await planStages(
      Experience.find({ deletedAt: null, isActive: true, $text: { $search: "costa" } }).sort({ score: { $meta: "textScore" }, _id: 1 }),
    );
    assert.ok(stages.includes("TEXT_MATCH") && stages.includes("IXSCAN") && !stages.includes("COLLSCAN"), stages.join(" > "));
  });

  // Medidas al hacerlo: si suben, algo consulta por cada elemento
  const BUDGETS = {
    "/shop/categories": 9,
    "/shop/hosts": 10,
    "/shop/locations": 9,
    "/shop/experiences": 14,
    "/shop/experiences?category=:category&search=moto&sort=priceFrom": 17,
    "/shop/experiences/:slug": 20,
    "/shop/experiences/:slug/departures": 10,
  };

  test("ninguna petición pasa de lo medido, y no crece con el número de elementos", async () => {
    let count = 0;
    mongoose.set("debug", (collection, method) => {
      if (method !== "createIndex") count++;
    });
    try {
      for (const [template, budget] of Object.entries(BUDGETS)) {
        const path = template.replace(":category", costa.slug).replace(":slug", costaExperience.slug);
        await api.anonymous.get(path);
        count = 0;
        const response = await api.anonymous.get(path);
        assert.equal(response.status, 200, template);
        assert.ok(count <= budget, `${template}: ${count} consultas, el máximo es ${budget}`);
      }
    } finally {
      mongoose.set("debug", false);
    }
  });
});
