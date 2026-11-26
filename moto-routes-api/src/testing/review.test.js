import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { TEST_PASSWORD, fieldMessage, seedBasics, startApi } from "./app.js";

// Las opiniones de las experiencias y de los anfitriones, y las notas que se calculan con ellas
let api;
let data;
let ana; // la anfitriona de la experiencia de seedBasics
let riders;
before(async () => {
  api = await startApi("review");
  data = await seedBasics(api);
  ana = await api.loginAs("ana@example.com");
  riders = [];
  for (let i = 1; i <= 8; i++) {
    await api.post("/users", { name: `Rider ${i}`, email: `rider${i}@example.com`, password: TEST_PASSWORD, roleId: data.rider._id });
    riders.push(await api.loginAs(`rider${i}@example.com`));
  }
});
after(() => api?.stop());

const LONG = "La organización falló bastante y el ritmo fue peligroso.";
const forExperience = (experience, extra = {}) => ({ targetType: "experience", targetId: experience._id, rating: 5, ...extra });
const forHost = (host, extra = {}) => ({ targetType: "host", targetId: host._id, rating: 5, ...extra });

// Una experiencia nueva de Ana, con su ruta (para que las notas de cada prueba empiecen de cero)
let count = 0;
async function newExperience(overrides = {}) {
  count++;
  const route =
    overrides.routeId ??
    (
      await api.post("/routes", {
        title: `Ruta de prueba ${count}`,
        difficulty: "easy",
        distance: 50,
        duration: 2,
        categoryId: data.category._id,
        startLocationId: data.location._id,
        endLocationId: data.location._id,
      })
    ).body._id;
  const { routeId: _, ...rest } = overrides;
  const response = await api.post("/experiences", {
    hostId: data.host._id,
    routeId: route,
    title: `Experiencia de prueba ${count}`,
    duration: 4,
    maxParticipants: 8,
    ...rest,
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body;
}

// Otro anfitrión, con su usuario
async function newHost(name) {
  const email = `${name.toLowerCase().replace(/\W/g, "")}@example.com`;
  const user = (await api.post("/users", { name, email, password: TEST_PASSWORD, roleId: data.hostRole._id })).body;
  const host = (await api.post("/hosts", { userId: user._id, name })).body;
  return { host, session: await api.loginAs(email) };
}

const shopExperience = async (experience) => (await api.anonymous.get(`/shop/experiences/${experience.slug}`)).body.data;
const shopHost = async (host) => (await api.anonymous.get(`/shop/hosts/${host.slug}`)).body.data;

// ---------- crear ----------

describe("crear una opinión", () => {
  test("de una experiencia y de un anfitrión: es de quien la escribe, y del autor solo sale el nombre", async () => {
    const experience = await newExperience();
    const [marta] = riders;
    const response = await marta.post("/reviews", forExperience(experience, { title: "Genial", comment: "El paisaje es una maravilla." }));

    assert.equal(response.status, 201, JSON.stringify(response.body));
    assert.equal(response.body.rating, 5);
    assert.equal(response.body.title, "Genial");
    assert.equal(response.body.userId, (await marta.get("/profile/me")).body._id);
    assert.equal(response.body.verified, false);
    assert.equal(response.body.isActive, true);
    assert.deepEqual(Object.keys(response.body.user).sort(), ["_id", "coverImage", "name"]);
    assert.equal(response.body.target.name, experience.title);

    const host = await marta.post("/reviews", forHost(data.host, { rating: 4 }));
    assert.equal(host.status, 201);
    assert.equal(host.body.target.name, data.host.name);
  });

  test("una por usuario y objetivo: la segunda es un 409 REVIEW_ALREADY_EXISTS, también si llegan a la vez", async () => {
    const experience = await newExperience();
    const [, luis, sara] = riders;
    assert.equal((await luis.post("/reviews", forExperience(experience))).status, 201);
    const again = await luis.post("/reviews", forExperience(experience, { rating: 3 }));
    assert.equal(again.status, 409);
    assert.equal(again.body.code, "REVIEW_ALREADY_EXISTS");

    const both = await Promise.all([sara.post("/reviews", forExperience(experience)), sara.post("/reviews", forExperience(experience))]);
    assert.deepEqual(both.map((response) => response.status).sort(), [201, 409]);
    assert.equal(both.find((response) => response.status === 409).body.code, "REVIEW_ALREADY_EXISTS");
  });

  test("se puede opinar de una experiencia y de su anfitrión a la vez", async () => {
    const experience = await newExperience();
    const { host } = await newHost("Guía Doble");
    const rider = riders[3];
    assert.equal((await rider.post("/reviews", forExperience(experience))).status, 201);
    assert.equal((await rider.post("/reviews", forHost(host))).status, 201);
  });

  test("el anfitrión no opina sobre sí mismo ni sobre sus experiencias: 403 OWN_TARGET", async () => {
    const experience = await newExperience();
    for (const body of [forExperience(experience), forHost(data.host)]) {
      const response = await ana.post("/reviews", body);
      assert.equal(response.status, 403);
      assert.equal(response.body.code, "OWN_TARGET");
    }
  });

  test("una experiencia o un anfitrión inactivos, o que no existen: 404", async () => {
    const experience = await newExperience();
    await api.patch(`/experiences/${experience._id}/active`, { isActive: false });
    assert.equal((await riders[0].post("/reviews", forExperience(experience))).status, 404);

    const { host } = await newHost("Guía Inactivo");
    await api.patch(`/hosts/${host._id}/active`, { isActive: false });
    assert.equal((await riders[0].post("/reviews", forHost(host))).status, 404);
    assert.equal((await riders[0].post("/reviews", forHost({ _id: "6710a1b2c3d4e5f6a7b8c999" }))).status, 404);
  });

  test("sin sesión, 401", async () => {
    assert.equal((await api.anonymous.post("/reviews", forHost(data.host))).status, 401);
  });

  test("validaciones: estrellas de 1 a 5, solo experience o host, y ni userId ni verified", async () => {
    const experience = await newExperience();
    const rider = riders[4];
    const cases = [
      [forExperience(experience, { rating: 6 }), "rating"],
      [forExperience(experience, { rating: 4.5 }), "rating"],
      [{ ...forExperience(experience), targetType: "route" }, "targetType"],
      [forExperience(experience, { userId: data.user._id }), "userId"],
      [forExperience(experience, { verified: true }), "verified"],
      [forExperience(experience, { comment: "corto" }), "comment"],
      [forExperience(experience, { title: "x".repeat(101) }), "title"],
    ];
    for (const [body, field] of cases) {
      const response = await rider.post("/reviews", body);
      assert.equal(response.status, 400, field);
      assert.ok(fieldMessage(response, field), field);
    }
  });
});

// ---------- el comentario y las notas bajas ----------

describe("con 1 o 2 estrellas el comentario es obligatorio", () => {
  test("con 3 a 5 es opcional; con 1 o 2, de 30 caracteres como mínimo (400 COMMENT_REQUIRED_FOR_LOW_RATING)", async () => {
    const experience = await newExperience();
    const [a, b, c, d] = riders;
    assert.equal((await a.post("/reviews", forExperience(experience, { rating: 4 }))).status, 201);
    assert.equal((await b.post("/reviews", forExperience(experience, { rating: 3, comment: "" }))).status, 201);

    for (const extra of [{ rating: 1 }, { rating: 2, comment: "Fue regular sin más." }, { rating: 2, comment: "   " }]) {
      const response = await c.post("/reviews", forExperience(experience, extra));
      assert.equal(response.status, 400, JSON.stringify(extra));
      assert.equal(response.body.code, "COMMENT_REQUIRED_FOR_LOW_RATING");
      assert.match(fieldMessage(response, "comment"), /required with 2 stars or less/);
    }
    assert.equal((await d.post("/reviews", forExperience(experience, { rating: 1, comment: LONG }))).status, 201);
  });

  test("al editar se comprueba con la opinión como quedaría", async () => {
    const experience = await newExperience();
    const [rider, other] = riders;
    const four = (await rider.post("/reviews", forExperience(experience, { rating: 4 }))).body;
    const down = await rider.patch(`/reviews/${four._id}`, { rating: 1 });
    assert.equal(down.status, 400);
    assert.equal(down.body.code, "COMMENT_REQUIRED_FOR_LOW_RATING");
    assert.equal((await rider.patch(`/reviews/${four._id}`, { rating: 1, comment: LONG })).status, 200);

    const two = (await other.post("/reviews", forExperience(experience, { rating: 2, comment: LONG }))).body;
    const cleared = await other.patch(`/reviews/${two._id}`, { comment: null });
    assert.equal(cleared.status, 400);
    assert.equal(cleared.body.code, "COMMENT_REQUIRED_FOR_LOW_RATING");
    // Subiendo la nota sí se puede quitar
    const up = await other.patch(`/reviews/${two._id}`, { rating: 4, comment: null });
    assert.equal(up.status, 200);
    assert.equal(up.body.comment, undefined);
  });
});

// ---------- editar y borrar ----------

describe("cada uno con la suya", () => {
  test("solo su autor la edita: ni otro rider ni el admin", async () => {
    const experience = await newExperience();
    const [author, other] = riders;
    const review = (await author.post("/reviews", forExperience(experience, { comment: "Una ruta preciosa de verdad." }))).body;

    const edited = await author.patch(`/reviews/${review._id}`, { rating: 4, title: "Muy bien" });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.rating, 4);
    assert.equal(edited.body.title, "Muy bien");

    assert.equal((await other.patch(`/reviews/${review._id}`, { rating: 1, comment: LONG })).status, 403);
    assert.equal((await api.patch(`/reviews/${review._id}`, { rating: 3 })).status, 403);
    assert.equal((await author.patch(`/reviews/${review._id}`, { targetId: data.host._id })).status, 400);
    assert.equal((await author.patch(`/reviews/${review._id}`, {})).status, 400);
  });

  test("no se puede borrar la de otro (403); su autor y el admin sí, y después se puede volver a opinar", async () => {
    const experience = await newExperience();
    const [author, other, third] = riders;
    const review = (await author.post("/reviews", forExperience(experience))).body;

    assert.equal((await other.patch(`/reviews/${review._id}/delete`)).status, 403);
    assert.equal((await author.patch(`/reviews/${review._id}/delete`)).status, 204);
    assert.equal((await author.patch(`/reviews/${review._id}/delete`)).status, 404);
    assert.equal((await author.post("/reviews", forExperience(experience, { rating: 3 }))).status, 201);

    const another = (await third.post("/reviews", forExperience(experience))).body;
    assert.equal((await api.patch(`/reviews/${another._id}/delete`)).status, 204);
  });

  test("restaurar es del admin, y no si su autor ya ha vuelto a opinar (409)", async () => {
    const experience = await newExperience();
    const [author, other] = riders;
    const review = (await author.post("/reviews", forExperience(experience))).body;
    await author.patch(`/reviews/${review._id}/delete`);

    assert.equal((await author.patch(`/reviews/${review._id}/restore`, {})).status, 403);
    assert.equal((await api.patch(`/reviews/${review._id}/restore`, {})).status, 200);

    const second = (await other.post("/reviews", forExperience(experience))).body;
    await other.patch(`/reviews/${second._id}/delete`);
    assert.equal((await other.post("/reviews", forExperience(experience, { rating: 2, comment: LONG }))).status, 201);
    const blocked = await api.patch(`/reviews/${second._id}/restore`, {});
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.code, "REVIEW_ALREADY_EXISTS");
  });
});

// ---------- las notas ----------

describe("las notas guardadas", () => {
  test("la de la experiencia: media, cuántas y de cada nota, al crear, editar, ocultar y borrar", async () => {
    const experience = await newExperience();
    assert.deepEqual((await shopExperience(experience)).rating, {
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });

    const [a, b, c] = riders;
    const ra = (await a.post("/reviews", forExperience(experience, { rating: 5 }))).body;
    await b.post("/reviews", forExperience(experience, { rating: 4 }));
    const rc = (await c.post("/reviews", forExperience(experience, { rating: 2, comment: LONG }))).body;
    let rating = (await shopExperience(experience)).rating;
    assert.equal(rating.count, 3);
    assert.equal(rating.average, 3.67);
    assert.deepEqual(rating.distribution, { 1: 0, 2: 1, 3: 0, 4: 1, 5: 1 });

    await a.patch(`/reviews/${ra._id}`, { rating: 3 });
    assert.equal((await shopExperience(experience)).rating.average, 3);

    // Oculta: no cuenta; vuelve a mostrarse: cuenta
    await api.patch(`/reviews/${rc._id}/active`, { isActive: false });
    rating = (await shopExperience(experience)).rating;
    assert.deepEqual([rating.count, rating.average], [2, 3.5]);
    await api.patch(`/reviews/${rc._id}/active`, { isActive: true });
    assert.equal((await shopExperience(experience)).rating.count, 3);

    await c.patch(`/reviews/${rc._id}/delete`);
    rating = (await shopExperience(experience)).rating;
    assert.deepEqual([rating.count, rating.average], [2, 3.5]);
  });

  test("el anfitrión: la suya como guía y la de todas sus experiencias; la ruta, la de sus experiencias", async () => {
    const { host, session } = await newHost("Guía Notas");
    const route = (
      await api.post("/routes", {
        title: "Ruta compartida",
        difficulty: "medium",
        distance: 90,
        duration: 3,
        categoryId: data.category._id,
        startLocationId: data.location._id,
        endLocationId: data.location._id,
      })
    ).body;
    const make = async (title) =>
      (
        await session.post("/experiences", { hostId: host._id, routeId: route._id, title, duration: 4, maxParticipants: 8 })
      ).body;
    const one = await make("Primera del guía");
    const two = await make("Segunda del guía");

    const [a, b, c] = riders;
    await a.post("/reviews", forExperience(one, { rating: 5 }));
    await b.post("/reviews", forExperience(two, { rating: 3 }));
    await c.post("/reviews", forHost(host, { rating: 4 }));

    let card = await shopHost(host);
    assert.deepEqual([card.rating.count, card.rating.average], [1, 4]);
    assert.deepEqual([card.experiencesRating.count, card.experiencesRating.average], [2, 4]);
    assert.deepEqual(card.experiences.map((experience) => experience.title).sort(), ["Primera del guía", "Segunda del guía"]);
    let detail = await shopExperience(one);
    assert.deepEqual([detail.route.rating.count, detail.route.rating.average], [2, 4]);

    // Desactivar una experiencia la quita de las notas de su anfitrión y de su ruta
    await session.patch(`/experiences/${two._id}/active`, { isActive: false });
    card = await shopHost(host);
    assert.deepEqual([card.experiencesRating.count, card.experiencesRating.average], [1, 5]);
    detail = await shopExperience(one);
    assert.equal(detail.route.rating.count, 1);

    // Pasarla a otro anfitrión y a otra ruta: cuenta en los nuevos y deja de contar en los de antes
    await session.patch(`/experiences/${two._id}/active`, { isActive: true });
    await api.patch(`/experiences/${two._id}`, { hostId: data.host._id, routeId: data.route._id });
    card = await shopHost(host);
    assert.equal(card.experiencesRating.count, 1);
    assert.equal((await shopExperience(one)).route.rating.count, 1);
    const moved = await shopExperience(two);
    assert.ok(moved.route.rating.count >= 1);
  });

  test("el Shop se puede ordenar por valoración", async () => {
    const response = await api.anonymous.get("/shop/experiences?sort=-rating&limit=50");
    assert.equal(response.status, 200);
    const averages = response.body.data.map((experience) => experience.rating?.average ?? 0);
    assert.deepEqual(averages, [...averages].sort((x, y) => y - x));
  });
});

// ---------- la tienda ----------

describe("las opiniones en la tienda", () => {
  test("solo las visibles, con su resumen, orden, filtro por estrellas y páginas", async () => {
    const experience = await newExperience();
    const ratings = [5, 4, 4, 3, 1];
    const created = [];
    for (const [index, rating] of ratings.entries()) {
      const extra = rating <= 2 ? { comment: LONG } : {};
      created.push((await riders[index].post("/reviews", forExperience(experience, { rating, ...extra }))).body);
    }
    await api.patch(`/reviews/${created[1]._id}/active`, { isActive: false });
    await riders[2].patch(`/reviews/${created[2]._id}/delete`);

    const base = `/shop/experiences/${experience.slug}/reviews`;
    const all = await api.anonymous.get(base);
    assert.equal(all.status, 200);
    assert.equal(all.body.data.length, 3);
    assert.deepEqual(all.body.pagination, { total: 3, page: 1, limit: 10, totalPages: 1 });
    assert.deepEqual([all.body.summary.count, all.body.summary.average], [3, 3]);
    assert.equal(all.body.data[0].user.email, undefined);

    const best = await api.anonymous.get(`${base}?sort=best`);
    assert.deepEqual(best.body.data.map((review) => review.rating), [5, 3, 1]);
    const worst = await api.anonymous.get(`${base}?sort=worst`);
    assert.deepEqual(worst.body.data.map((review) => review.rating), [1, 3, 5]);
    const fives = await api.anonymous.get(`${base}?rating=5`);
    assert.deepEqual(fives.body.data.map((review) => review.rating), [5]);
    assert.equal(fives.body.summary.count, 3);
    const page = await api.anonymous.get(`${base}?limit=2&page=2`);
    assert.equal(page.body.data.length, 1);

    assert.equal((await api.anonymous.get(`${base}?limit=50`)).status, 400);
    assert.equal((await api.anonymous.get(`${base}?sort=nuevas`)).status, 400);
    assert.equal((await api.anonymous.get("/shop/experiences/no-existe/reviews")).status, 404);
  });

  test("las de un anfitrión, y las de algo inactivo dan 404", async () => {
    const { host } = await newHost("Guía Tienda");
    await riders[0].post("/reviews", forHost(host, { rating: 4 }));
    const response = await api.anonymous.get(`/shop/hosts/${host.slug}/reviews`);
    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 1);

    await api.patch(`/hosts/${host._id}/active`, { isActive: false });
    assert.equal((await api.anonymous.get(`/shop/hosts/${host.slug}/reviews`)).status, 404);
    assert.equal((await api.anonymous.get(`/shop/hosts/${host.slug}`)).status, 404);
  });

  test("mi opinión: si puedo opinar y, si no, por qué", async () => {
    const experience = await newExperience();
    const rider = riders[5];
    const url = `/shop/experiences/${experience.slug}/reviews/mine`;

    assert.equal((await api.anonymous.get(url)).status, 401);
    assert.deepEqual((await rider.get(url)).body.data, { review: null, canReview: true, reason: null });

    await rider.post("/reviews", forExperience(experience, { rating: 4 }));
    const mine = (await rider.get(url)).body.data;
    assert.equal(mine.canReview, false);
    assert.equal(mine.reason, "REVIEW_ALREADY_EXISTS");
    assert.equal(mine.review.rating, 4);

    const own = (await ana.get(url)).body.data;
    assert.deepEqual([own.canReview, own.reason], [false, "OWN_TARGET"]);
    assert.equal((await ana.get(`/shop/hosts/${data.host.slug}/reviews/mine`)).body.data.reason, "OWN_TARGET");
  });
});

// ---------- el panel ----------

describe("el listado completo es del admin", () => {
  test("un rider recibe 403 y sin sesión 401; el admin las ve todas, con filtros", async () => {
    assert.equal((await riders[0].get("/reviews")).status, 403);
    assert.equal((await api.anonymous.get("/reviews")).status, 401);
    assert.equal((await riders[0].get("/reviews/deleted")).status, 403);

    const experience = await newExperience();
    const review = (await riders[6].post("/reviews", forExperience(experience, { rating: 3 }))).body;
    await api.patch(`/reviews/${review._id}/active`, { isActive: false });

    const hidden = await api.get(`/reviews?status=inactive&targetId=${experience._id}`);
    assert.equal(hidden.status, 200);
    assert.deepEqual(hidden.body.map((item) => item._id), [review._id]);
    assert.equal(hidden.body[0].target.slug, experience.slug);
    assert.equal((await api.get(`/reviews?status=active&targetId=${experience._id}`)).body.length, 0);
    assert.equal((await api.get("/reviews/inactives")).body.some((item) => item._id === review._id), true);
    assert.equal((await api.get(`/reviews/${review._id}`)).body.rating, 3);

    // El buscador del panel: en el título y el comentario
    const word = (await riders[7].post("/reviews", forExperience(experience, { rating: 5, comment: "Volvería mañana mismo, el zarandeo de curvas fue perfecto" }))).body;
    assert.deepEqual((await api.get(`/reviews?q=zarandeo&targetId=${experience._id}`)).body.map((item) => item._id), [word._id]);

    const paged = await api.get("/reviews?targetType=host&page=1&limit=1");
    assert.equal(paged.body.length, 1);
    assert.ok(Number(paged.headers.get("x-total-count")) >= 1);
  });
});
