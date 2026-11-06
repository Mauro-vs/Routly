import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { Departure } from "../models/departure.model.js";
import { Route } from "../models/route.model.js";
import { departureListQuery } from "../schemas/departure.schema.js";
import { routeListQuery } from "../schemas/route.schema.js";
import { DAY, fieldMessage, fromNow, seedBasics, startApi } from "./app.js";

// Query params de los listados (utils/listQuery.js): los comunes, los filtros de cada colección,
// la paginación con sus cabeceras y que las consultas usan índices.
let api;
let data;
let jaca;
let tarragona;
let costa;

const titles = (response) => response.body.map((item) => item.title);

before(async () => {
  api = await startApi("listquery");
  data = await seedBasics(api);
  // seedBasics deja "Valle de Tena" (medium, 80 km, 3 h, Montaña, Jaca → Jaca)
  jaca = data.location;
  tarragona = (await api.post("/locations", { city: "Tarragona", country: "España" })).body;
  costa = (await api.post("/categories", { name: "Costa" })).body;

  const route = (title, difficulty, distance, duration, categoryId, start, end) =>
    api.post("/routes", { title, difficulty, distance, duration, categoryId, startLocationId: start, endLocationId: end });
  await route("Travesía del Pirineo", "hard", 320, 7, data.category._id, jaca._id, jaca._id);
  await route("Costa Dorada", "easy", 120, 3, costa._id, tarragona._id, tarragona._id);
  await route("Puertos del Pirineo aragonés", "hard", 150, 5, data.category._id, jaca._id, tarragona._id);
  const off = (await route("Ruta apagada", "easy", 40, 1, costa._id, tarragona._id, tarragona._id)).body;
  await api.patch(`/routes/${off._id}/active`, { isActive: false });
});
after(() => api?.stop());

describe("sin query params", () => {
  test("el listado responde como siempre: todo, sin cabeceras de página", async () => {
    const response = await api.get("/routes");

    assert.equal(response.status, 200);
    assert.equal(response.body.length, 5);
    assert.equal(response.headers.get("x-total-count"), null);
  });
});

describe("q: búsqueda de texto", () => {
  test("encuentra por palabras del título, sin distinguir mayúsculas", async () => {
    const response = await api.get("/routes?q=PIRINEO");
    assert.deepEqual(titles(response).sort(), ["Puertos del Pirineo aragonés", "Travesía del Pirineo"]);
  });

  test("en español: el plural encuentra el singular", async () => {
    assert.deepEqual(titles(await api.get("/routes?q=puerto")), ["Puertos del Pirineo aragonés"]);
  });

  test("sin coincidencias, una lista vacía", async () => {
    assert.deepEqual((await api.get("/routes?q=desierto")).body, []);
  });

  test("también sin sesión, junto con el filtro de lo público", async () => {
    const response = await api.anonymous.get("/routes?q=pirineo");
    assert.equal(response.status, 200);
    assert.equal(response.body.length, 2);
  });
});

describe("status", () => {
  test("active e inactive filtran por estado", async () => {
    assert.deepEqual(titles(await api.get("/routes?status=inactive")), ["Ruta apagada"]);
    assert.equal((await api.get("/routes?status=active")).body.length, 4);
  });

  test("/actives devuelve lo mismo que ?status=active", async () => {
    const actives = await api.get("/routes/actives");
    const byStatus = await api.get("/routes?status=active");
    assert.deepEqual(titles(actives), titles(byStatus));
  });

  test("sin sesión no se ven las inactivas aunque se pidan", async () => {
    assert.deepEqual((await api.anonymous.get("/routes?status=inactive")).body, []);
  });

  test("un estado que no existe es un 400", async () => {
    const response = await api.get("/routes?status=deleted");
    assert.equal(response.status, 400);
    assert.match(fieldMessage(response, "status"), /must be one of: active, inactive/);
  });
});

describe("sort", () => {
  test("ordena por uno o varios campos; el - es descendente", async () => {
    const byDistance = await api.get("/routes?sort=-distance");
    assert.deepEqual(byDistance.body.map((route) => route.distance), [320, 150, 120, 80, 40]);

    const byDifficultyThenTitle = await api.get("/routes?sort=difficulty,title&status=active");
    assert.deepEqual(titles(byDifficultyThenTitle), [
      "Costa Dorada",
      "Puertos del Pirineo aragonés",
      "Travesía del Pirineo",
      "Valle de Tena",
    ]);
  });

  test("un campo que no se puede ordenar es un 400 que dice cuáles valen", async () => {
    const response = await api.get("/routes?sort=-password");
    assert.equal(response.status, 400);
    assert.equal(
      fieldMessage(response, "sort"),
      "sort must be a comma-separated list of: title, distance, duration, difficulty, createdAt, updatedAt",
    );
  });
});

describe("page y limit", () => {
  test("una página trae solo sus elementos y el total va en las cabeceras", async () => {
    const response = await api.get("/routes?sort=distance&page=2&limit=2");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.map((route) => route.distance), [120, 150]);
    assert.equal(response.headers.get("x-total-count"), "5");
    assert.equal(response.headers.get("x-page"), "2");
    assert.equal(response.headers.get("x-limit"), "2");
  });

  test("las páginas no repiten ni se saltan nada", async () => {
    const seen = [];
    for (const page of [1, 2, 3]) {
      const response = await api.get(`/routes?sort=difficulty&page=${page}&limit=2`);
      seen.push(...response.body.map((route) => route._id));
    }
    assert.equal(seen.length, 5);
    assert.equal(new Set(seen).size, 5);
  });

  test("el total cuenta lo filtrado, no la colección", async () => {
    const response = await api.get("/routes?difficulty=hard&page=1");
    assert.equal(response.headers.get("x-total-count"), "2");
    assert.equal(response.headers.get("x-limit"), "20");
  });

  test("limit sin page es la primera página", async () => {
    const response = await api.get("/routes?limit=1");
    assert.equal(response.body.length, 1);
    assert.equal(response.headers.get("x-page"), "1");
  });

  test("page 0, limit 0 o limit 101 son un 400", async () => {
    assert.match(fieldMessage(await api.get("/routes?page=0"), "page"), /greater than or equal to 1/);
    assert.match(fieldMessage(await api.get("/routes?limit=0"), "limit"), /greater than or equal to 1/);
    assert.match(fieldMessage(await api.get("/routes?limit=101"), "limit"), /less than or equal to 100/);
    assert.equal((await api.get("/routes?page=dos")).status, 400);
  });
});

describe("filtros de las rutas", () => {
  test("se combinan: dificultad, categoría y distancia mínima", async () => {
    const response = await api.get(`/routes?difficulty=hard&categoryId=${data.category._id}&distanceMin=200`);
    assert.deepEqual(titles(response), ["Travesía del Pirineo"]);
  });

  test("locationId encuentra la ubicación como origen o como destino", async () => {
    const response = await api.get(`/routes?locationId=${tarragona._id}&status=active`);
    assert.deepEqual(titles(response).sort(), ["Costa Dorada", "Puertos del Pirineo aragonés"]);
  });

  test("rangos de distancia y duración, con los extremos incluidos", async () => {
    const response = await api.get("/routes?distanceMin=80&distanceMax=150&durationMax=3&sort=distance");
    assert.deepEqual(titles(response), ["Valle de Tena", "Costa Dorada"]);
  });

  test("un mínimo mayor que el máximo es un 400 en el máximo", async () => {
    const response = await api.get("/routes?distanceMin=300&distanceMax=100");
    assert.equal(response.status, 400);
    assert.equal(fieldMessage(response, "distanceMax"), "distanceMax must be greater than or equal to distanceMin");
  });

  test("un parámetro que no existe es un 400, como un campo de más en el body", async () => {
    const response = await api.get("/routes?color=rojo");
    assert.equal(response.status, 400);
    assert.equal(fieldMessage(response, "color"), "color is not allowed");
  });

  test("un id mal formado o un número que no lo es son un 400", async () => {
    assert.equal((await api.get("/routes?categoryId=montana")).status, 400);
    assert.equal((await api.get("/routes?distanceMin=lejos")).status, 400);
  });
});

describe("filtros de las demás colecciones", () => {
  test("salidas: estado, fechas y precio", async () => {
    await api.post("/departures", {
      experienceId: data.experience._id,
      startAt: fromNow(40 * DAY),
      endAt: fromNow(40 * DAY + 8 * 60 * 60 * 1000),
      capacity: 6,
      price: 300,
    });

    const cheap = await api.get("/departures?state=scheduled&priceMax=200");
    assert.deepEqual(cheap.body.map((departure) => departure.price), [120]);

    const later = await api.get(`/departures?from=${fromNow(30 * DAY)}`);
    assert.deepEqual(later.body.map((departure) => departure.price), [300]);

    const crossed = await api.get(`/departures?from=${fromNow(30 * DAY)}&to=${fromNow(DAY)}`);
    assert.equal(fieldMessage(crossed, "to"), "to must be greater than or equal to from");
  });

  test("experiencias: por anfitrión, ruta e idioma", async () => {
    assert.equal((await api.get(`/experiences?hostId=${data.host._id}&language=es`)).body.length, 1);
    assert.equal((await api.get("/experiences?language=fr")).body.length, 0);
    assert.equal((await api.get("/experiences?language=klingon")).status, 400);
  });

  test("usuarios por rol; roles base con isSystem", async () => {
    const hosts = await api.get(`/users?roleId=${data.hostRole._id}`);
    assert.deepEqual(hosts.body.map((user) => user.email), ["ana@example.com"]);

    const system = await api.get("/roles?isSystem=true");
    assert.deepEqual(system.body.map((role) => role.name), ["admin"]);
    assert.equal((await api.get("/roles?isSystem=quizas")).status, 400);
  });

  test("motos: tipo, carnet y cilindrada", async () => {
    await api.post("/bikes", { userId: data.user._id, brand: "BMW", model: "R 1250 GS", type: "adventure", cc: 1254, hp: 136 });
    await api.post("/bikes", { userId: data.user._id, brand: "Honda", model: "CB125R", type: "naked", cc: 125, hp: 15 });

    assert.deepEqual((await api.get("/bikes?type=naked")).body.map((bike) => bike.brand), ["Honda"]);
    assert.deepEqual((await api.get("/bikes?license=A1")).body.map((bike) => bike.brand), ["Honda"]);
    assert.deepEqual((await api.get("/bikes?ccMin=500")).body.map((bike) => bike.brand), ["BMW"]);
    assert.deepEqual((await api.get("/bikes?q=honda")).body.map((bike) => bike.brand), ["Honda"]);
  });

  test("ubicaciones por país, entero y sin distinguir mayúsculas", async () => {
    await api.post("/locations", { city: "Pau", country: "Francia" });

    assert.deepEqual((await api.get("/locations?country=FRANCIA")).body.map((location) => location.city), ["Pau"]);
    // El país entero: "Fran" no es Francia
    assert.deepEqual((await api.get("/locations?country=Fran")).body, []);
  });

  test("imágenes: ownerType y ownerId van juntos", async () => {
    const response = await api.get("/images?ownerType=route");
    assert.equal(response.status, 400);
    assert.equal(fieldMessage(response, "ownerType"), "ownerType and ownerId must be sent together");
    assert.equal((await api.get(`/images?ownerType=route&ownerId=${data.route._id}&isCover=true`)).status, 200);
  });
});

describe("índices", () => {
  // Todas las etapas del plan ganador de MongoDB: IXSCAN usa un índice, COLLSCAN recorre la colección
  function stagesOf(plan) {
    if (!plan || typeof plan !== "object") return [];
    const own = plan.stage ? [plan.stage] : [];
    const children = [plan.inputStage, ...(plan.inputStages ?? [])].flatMap(stagesOf);
    return [...own, ...children];
  }

  async function planOf(model, { filter, sort }) {
    const explained = await model.find(filter).sort(sort ?? { createdAt: -1 }).explain("queryPlanner");
    const result = Array.isArray(explained) ? explained[0] : explained;
    return stagesOf(result.queryPlanner.winningPlan);
  }

  const assertUsesIndex = (stages, expected = "IXSCAN") => {
    assert.ok(stages.includes(expected), `se esperaba ${expected}: ${stages.join(" > ")}`);
    assert.ok(!stages.includes("COLLSCAN"), `recorre la colección: ${stages.join(" > ")}`);
  };

  test("el listado de siempre (sin eliminados, por estado y por fecha) usa un índice", async () => {
    assertUsesIndex(await planOf(Route, routeListQuery.build({})));
    assertUsesIndex(await planOf(Route, routeListQuery.build({ status: "active" })));
  });

  test("los filtros de las rutas usan su índice", async () => {
    assertUsesIndex(await planOf(Route, routeListQuery.build({ difficulty: "hard" })));
    assertUsesIndex(await planOf(Route, routeListQuery.build({ distanceMin: 100 })));
  });

  test("q usa el índice de texto", async () => {
    assertUsesIndex(await planOf(Route, routeListQuery.build({ q: "pirineo" })), "TEXT_MATCH");
  });

  test("las salidas por estado y fecha usan su índice", async () => {
    const query = departureListQuery.build({ state: "scheduled", from: new Date() });
    assertUsesIndex(await planOf(Departure, { ...query, sort: { startAt: 1 } }));
  });
});
