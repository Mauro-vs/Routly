import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import mongoose from "mongoose";
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
// En el orden en que llegan
const names = (response) => response.body.map((experience) => experience.title);

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

describe("lo que trae cada experiencia", () => {
  const byTitle = (response) => Object.fromEntries(response.body.map((experience) => [experience.title, experience]));

  test("su ruta, con km, horas, dificultad, categoría y ubicaciones", async () => {
    const costaEnMoto = byTitle(await api.anonymous.get("/experiences"))["Costa en moto"];

    assert.equal(costaEnMoto.route.title, "Costa Dorada");
    assert.equal(costaEnMoto.route.distance, 120);
    assert.equal(costaEnMoto.route.duration, 3);
    assert.equal(costaEnMoto.route.difficulty, "easy");
    assert.equal(costaEnMoto.route.category.name, "Costa");
    assert.equal(costaEnMoto.route.startLocation.city, data.location.city);
    assert.equal(costaEnMoto.route.endLocation.city, "Tarragona");
  });

  test("su foto principal", async () => {
    const url = "https://picsum.photos/seed/costa-en-moto/1200/800";
    await api.post("/images", { ownerType: "experience", ownerId: costaExperience._id, url, alt: "Costa en moto" });

    const experiences = byTitle(await api.anonymous.get("/experiences"));
    assert.equal(experiences["Costa en moto"].coverImage.url, url);
    assert.equal(experiences["Pirineo en moto"].coverImage, null);
  });

  test("el precio desde y la próxima fecha, solo de sus salidas reservables", async () => {
    const experiences = byTitle(await api.anonymous.get("/experiences"));

    // Costa en moto: 80 € en 10 días y 400 € en 60; la de 50 € está cancelada
    assert.equal(experiences["Costa en moto"].priceFrom, 80);
    const next = new Date(experiences["Costa en moto"].nextDepartureAt).getTime();
    assert.ok(Math.abs(next - (Date.now() + 10 * DAY)) < DAY, "la próxima es la de dentro de 10 días");
    assert.equal(experiences["Pirineo en moto"].priceFrom, 120);
    // Delta salvaje: su única salida está desactivada
    assert.equal(experiences["Delta salvaje"].priceFrom, null);
    assert.equal(experiences["Delta salvaje"].nextDepartureAt, null);
  });

  test("el detalle trae lo mismo que la tarjeta", async () => {
    const detail = (await api.anonymous.get(`/experiences/slug/${costaExperience.slug}`)).body;

    assert.equal(detail.route.category.name, "Costa");
    assert.equal(detail.priceFrom, 80);
    assert.ok(detail.coverImage.url);
  });
});

describe("los órdenes nuevos del Shop", () => {
  test("por precio desde: las que no tienen salidas, siempre al final", async () => {
    assert.deepEqual(names(await api.anonymous.get("/experiences?sort=priceFrom")), ["Costa en moto", "Pirineo en moto", "Delta salvaje"]);
    assert.deepEqual(names(await api.anonymous.get("/experiences?sort=-priceFrom")), ["Pirineo en moto", "Costa en moto", "Delta salvaje"]);
  });

  test("por la próxima salida", async () => {
    // Pirineo sale en 7 días y Costa en 10
    assert.deepEqual(names(await api.anonymous.get("/experiences?sort=nextDepartureAt")), ["Pirineo en moto", "Costa en moto", "Delta salvaje"]);
  });

  test("con paginación: el orden se calcula antes de cortar la página", async () => {
    const second = await api.anonymous.get("/experiences?sort=priceFrom&page=2&limit=1");
    assert.deepEqual(names(second), ["Pirineo en moto"]);
    assert.equal(second.headers.get("x-total-count"), "3");
    assert.equal(second.headers.get("x-page"), "2");
  });

  test("con filtros, y con un segundo campo para desempatar", async () => {
    assert.deepEqual(names(await api.anonymous.get(`/experiences?categoryId=${costa._id}&sort=priceFrom`)), ["Costa en moto", "Delta salvaje"]);
    assert.deepEqual(names(await api.anonymous.get("/experiences?sort=nextDepartureAt,title&hasDepartures=true")), ["Pirineo en moto", "Costa en moto"]);
  });

  test("los órdenes de siempre siguen igual: por título y por más recientes", async () => {
    assert.deepEqual(names(await api.anonymous.get("/experiences?sort=title")), ["Costa en moto", "Delta salvaje", "Pirineo en moto"]);
    assert.equal(names(await api.anonymous.get("/experiences?sort=-createdAt"))[0], "Delta salvaje");
  });
});

describe("las facetas del Home", () => {
  // De cada lista: nombre (o ciudad) y cuántas experiencias tiene, en el orden en que llegan
  const summary = (items, label = "name") => items.map((item) => `${item[label]}: ${item.experienceCount}`);

  test("solo lo que tiene experiencias visibles, con cuántas, de más a menos", async () => {
    const response = await api.anonymous.get("/experiences/facets");

    assert.equal(response.status, 200);
    // Costa: Costa en moto y Delta salvaje. Desierto no tiene ninguna
    assert.deepEqual(summary(response.body.categories), ["Costa: 2", "Montaña: 1"]);
    assert.deepEqual(summary(response.body.hosts), ["Ana Rutas: 3"]);
    // Una ruta que empieza y acaba en Jaca (Valle de Tena) cuenta una vez; empatadas, por ciudad
    assert.deepEqual(summary(response.body.locations, "city"), ["Jaca: 2", "Tarragona: 2"]);
  });

  test("lo que pide cada tarjeta, y sin sesión el anfitrión no trae el email de su usuario", async () => {
    const { categories, hosts, locations } = (await api.anonymous.get("/experiences/facets")).body;

    assert.ok(categories[0].slug && "coverImage" in categories[0]);
    assert.ok(hosts[0].slug && "coverImage" in hosts[0]);
    assert.deepEqual(Object.keys(hosts[0].user).sort(), ["_id", "name"]);
    assert.ok(locations[0].slug && "coverImage" in locations[0]);
  });

  test("una experiencia oculta no cuenta", async () => {
    await api.patch(`/routes/${deltaRoute._id}/active`, { isActive: false });
    const { categories, locations } = (await api.anonymous.get("/experiences/facets")).body;
    await api.patch(`/routes/${deltaRoute._id}/active`, { isActive: true });

    assert.deepEqual(summary(categories), ["Costa: 1", "Montaña: 1"]);
    assert.deepEqual(summary(locations, "city"), ["Jaca: 2", "Tarragona: 1"]);
  });

  test("limit corta cada lista; un limit no válido o un parámetro de más es un 400", async () => {
    const { categories, locations } = (await api.anonymous.get("/experiences/facets?limit=1")).body;
    assert.deepEqual(summary(categories), ["Costa: 2"]);
    assert.equal(locations.length, 1);

    assert.equal((await api.anonymous.get("/experiences/facets?limit=0")).status, 400);
    assert.equal((await api.anonymous.get("/experiences/facets?limit=51")).status, 400);
    assert.equal(fieldMessage(await api.anonymous.get("/experiences/facets?q=moto"), "q"), "q is not allowed");
  });

  test("/facets no se confunde con /:id", async () => {
    assert.equal((await api.anonymous.get(`/experiences/${costaExperience._id}`)).status, 200);
  });
});

describe("las fotos de categorías y ubicaciones", () => {
  test("el listado, el detalle y las facetas traen la foto principal", async () => {
    const url = "https://picsum.photos/seed/costa/1200/800";
    await api.post("/images", { ownerType: "category", ownerId: costa._id, url, alt: "Costa" });

    const listed = (await api.anonymous.get("/categories")).body.find((category) => category._id === costa._id);
    assert.equal(listed.coverImage.url, url);
    assert.equal((await api.anonymous.get(`/categories/slug/${costa.slug}`)).body.coverImage.url, url);
    const faceted = (await api.anonymous.get("/experiences/facets")).body.categories.find((category) => category._id === costa._id);
    assert.equal(faceted.coverImage.url, url);
  });

  test("una ubicación sin fotos trae coverImage null, y sigue trayendo sus coordenadas", async () => {
    const jaca = (await api.anonymous.get("/locations")).body.find((location) => location._id === data.location._id);
    assert.equal(jaca.coverImage, null);
    assert.equal(jaca.latitude, 42.57);
  });
});

describe("cuántas consultas hace cada petición pública", () => {
  // Medidas al hacerlo (fase 4 del prompt del back): si suben, algo consulta por cada elemento o
  // vuelve a calcular lo oculto más de una vez por petición. Se cuentan con el debug de Mongoose,
  // sin la creación de índices, y en la segunda llamada (la primera puede crearlos).
  const BUDGETS = {
    "/experiences": 13,
    "/experiences?page=1&limit=12": 14,
    "/experiences?sort=priceFrom": 15,
    "/experiences?categoryId=:category&priceMax=500": 15,
    "/experiences/facets": 14,
    "/experiences/slug/:slug": 17,
    "/departures?experienceId=:experience&state=scheduled": 8,
    "/images?ownerType=experience&ownerId=:experience": 8,
    "/categories": 2,
    "/locations": 2,
    "/hosts": 4,
  };

  test("ninguna pasa de lo medido, y no crece con el número de elementos", async () => {
    let count = 0;
    mongoose.set("debug", (collection, method) => {
      if (method !== "createIndex") count++;
    });
    try {
      for (const [template, budget] of Object.entries(BUDGETS)) {
        const path = template
          .replace(":category", costa._id)
          .replace(":slug", costaExperience.slug)
          .replace(":experience", costaExperience._id);
        await api.anonymous.get(path);
        count = 0;
        await api.anonymous.get(path);
        assert.ok(count <= budget, `${template}: ${count} consultas, el máximo es ${budget}`);
      }
    } finally {
      mongoose.set("debug", false);
    }
  });
});

describe("las plazas libres de cada salida", () => {
  test("seatsLeft: hoy, sin reservas, toda la capacidad", async () => {
    const departures = (await api.anonymous.get(`/departures?experienceId=${costaExperience._id}`)).body;
    assert.ok(departures.length > 0);
    for (const departure of departures) assert.equal(departure.seatsLeft, departure.capacity);

    const one = (await api.anonymous.get(`/departures/slug/${departures[0].slug}`)).body;
    assert.equal(one.seatsLeft, one.capacity);
  });
});

describe("el detalle de una experiencia", () => {
  test("trae su anfitrión entero, sin el email de su usuario", async () => {
    await api.patch(`/hosts/${data.host._id}`, { biography: "Guía en el Pirineo desde 2010." });
    const { host } = (await api.anonymous.get(`/experiences/slug/${costaExperience.slug}`)).body;

    assert.equal(host.name, "Ana Rutas");
    assert.equal(host.biography, "Guía en el Pirineo desde 2010.");
    assert.ok("coverImage" in host);
    assert.deepEqual(Object.keys(host.user).sort(), ["_id", "name"]);
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

  test("el precio desde y la próxima fecha de las experiencias de una página", async () => {
    const ids = [costaExperience._id, deltaExperience._id];
    await assertUsesIndex(Departure.find({ experienceId: { $in: ids }, deletedAt: null, isActive: true, state: "scheduled", startAt: { $gte: new Date() } }));
  });

  test("las experiencias de unas rutas, o con unos _id", async () => {
    await assertUsesIndex(Experience.find({ routeId: { $in: [costaRoute._id, deltaRoute._id] } }));
    await assertUsesIndex(Experience.find({ _id: { $in: [costaExperience._id] } }));
  });
});
