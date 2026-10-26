import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Departure } from "../models/departure.model.js";
import { seedBasics, startApi } from "./app.js";

let api;
let data;
before(async () => {
  api = await startApi("slug");
  data = await seedBasics(api);
});
after(() => api?.stop());

const suffix = (id) => String(id).slice(-6);

test("el slug sale del texto, sin tildes, y termina en el _id", () => {
  assert.equal(data.category.slug, `montana-${suffix(data.category._id)}`);
  assert.equal(data.route.slug, `valle-de-tena-${suffix(data.route._id)}`);
  assert.equal(data.user.slug, `ana-perez-${suffix(data.user._id)}`);
});

test("el slug sigue al nombre al editarlo y conserva el sufijo", async () => {
  const { body } = await api.patch(`/categories/${data.category._id}`, { name: "Alta Montaña" });
  assert.equal(body.slug, `alta-montana-${suffix(data.category._id)}`);

  const found = await api.get(`/categories/slug/${body.slug}`);
  assert.equal(found.status, 200);
  assert.equal(found.body._id, data.category._id);
});

test("el slug de una salida lleva el título de la experiencia y la fecha de salida", () => {
  assert.match(data.departure.slug, /^pirineo-en-moto-\d{4}-\d{2}-\d{2}-[0-9a-f]{6}$/);
  assert.ok(data.departure.slug.endsWith(suffix(data.departure._id)));
});

test("al renombrar una experiencia se rehacen los slugs de sus salidas, también los eliminados", async () => {
  const second = await api.post("/departures", {
    experienceId: data.experience._id,
    startAt: new Date(Date.parse(data.departure.startAt) + 24 * 60 * 60 * 1000).toISOString(),
    endAt: new Date(Date.parse(data.departure.endAt) + 24 * 60 * 60 * 1000).toISOString(),
    capacity: 4,
    price: 90,
  });
  await api.patch(`/departures/${second.body._id}/delete`);

  const renamed = await api.patch(`/experiences/${data.experience._id}`, { title: "Gran Pirineo" });
  assert.equal(renamed.status, 200);

  const departures = await Departure.find({ experienceId: data.experience._id })
    .setOptions({ withDeleted: true })
    .lean();
  assert.equal(departures.length, 2);
  for (const departure of departures) {
    assert.ok(departure.slug.startsWith("gran-pirineo-"), departure.slug);
    assert.ok(departure.slug.endsWith(suffix(departure._id)));
  }
  assert.ok(departures.some((departure) => departure.deletedAt !== null));
});

test("un slug con formato inválido o demasiado largo da 400", async () => {
  assert.equal((await api.get("/routes/slug/Con-Mayusculas")).status, 400);
  assert.equal((await api.get(`/routes/slug/${"a".repeat(201)}`)).status, 400);
});

test("el slug no se puede cambiar a mano", async () => {
  const response = await api.patch(`/routes/${data.route._id}`, { slug: "otra" });
  assert.equal(response.status, 400);
  assert.equal(response.body.details[0].message, "slug cannot be changed");
});
