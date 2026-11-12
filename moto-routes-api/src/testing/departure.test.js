import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Departure } from "../models/departure.model.js";
import { madridDateParts } from "../utils/dates.js";
import { SKU_PATTERN } from "../utils/sku.js";
import { DAY, fieldMessage, fromNow, seedBasics, startApi } from "./app.js";

let api;
let data;
before(async () => {
  api = await startApi("departure");
  data = await seedBasics(api);
});
after(() => api?.stop());

const HOUR = 60 * 60 * 1000;
const body = (overrides = {}) => ({
  experienceId: data.experience._id,
  startAt: fromNow(30 * DAY),
  endAt: fromNow(30 * DAY + 4 * HOUR),
  capacity: 5,
  price: 50,
  ...overrides,
});

test("el SKU cumple el formato y lleva la fecha del alta, no la de salida", () => {
  const { year, month, day } = madridDateParts(new Date());
  assert.match(data.departure.sku, SKU_PATTERN);
  assert.ok(data.departure.sku.startsWith(`RTL-DEP-${year.slice(-2)}${month}${day}-`));
});

test("el SKU no se puede cambiar y se encuentra también en minúsculas", async () => {
  const changed = await api.patch(`/departures/${data.departure._id}`, { sku: "RTL-DEP-000000-AAAAA" });
  assert.equal(changed.status, 400);
  assert.equal(fieldMessage(changed, "sku"), "sku cannot be changed");

  const found = await api.get(`/departures/sku/${data.departure.sku.toLowerCase()}`);
  assert.equal(found.status, 200);
  assert.equal(found.body._id, data.departure._id);
});

test("cambiar la fecha de salida cambia el slug pero no el SKU", async () => {
  const { body: moved } = await api.patch(`/departures/${data.departure._id}`, {
    startAt: fromNow(20 * DAY),
    endAt: fromNow(20 * DAY + 4 * HOUR),
  });
  assert.equal(moved.sku, data.departure.sku);
  assert.notEqual(moved.slug, data.departure.slug);
});

test("las fechas solo se aceptan en ISO 8601 con hora y zona", async () => {
  for (const startAt of [true, 0, "2027", "2027-01-01"]) {
    const response = await api.post("/departures", body({ startAt }));
    assert.equal(response.status, 400, `startAt ${JSON.stringify(startAt)}`);
  }
  const withOffset = await api.post("/departures", body({
    startAt: "2027-03-01T09:00:00+01:00",
    endAt: "2027-03-01T13:00:00+01:00",
  }));
  assert.equal(withOffset.status, 201);
});

test("una salida empieza en el futuro, al crearla y al moverla", async () => {
  const past = await api.post("/departures", body({ startAt: fromNow(-DAY), endAt: fromNow(-DAY + HOUR) }));
  assert.equal(fieldMessage(past, "startAt"), "startAt must be in the future");

  const moved = await api.patch(`/departures/${data.departure._id}`, {
    startAt: fromNow(-2 * DAY),
    endAt: fromNow(-DAY),
  });
  assert.equal(fieldMessage(moved, "startAt"), "startAt must be in the future");
});

test("las plazas van entre el mínimo y el máximo de la experiencia", async () => {
  const tooFew = await api.post("/departures", body({ capacity: 1 }));
  assert.equal(fieldMessage(tooFew, "capacity"), "capacity must be greater than or equal to the experience minParticipants");

  const tooMany = await api.post("/departures", body({ capacity: 11 }));
  assert.equal(fieldMessage(tooMany, "capacity"), "capacity must be less than or equal to the experience maxParticipants");
});

test("la experiencia no puede dejar fuera de rango las plazas de sus salidas", async () => {
  const lower = await api.patch(`/experiences/${data.experience._id}`, { maxParticipants: 4 });
  assert.equal(lower.status, 409);
  assert.equal(lower.body.message, "maxParticipants is lower than the capacity of an existing departure");

  const higher = await api.patch(`/experiences/${data.experience._id}`, { minParticipants: 7 });
  assert.equal(higher.status, 409);
  assert.equal(higher.body.message, "minParticipants is higher than the capacity of an existing departure");
});

test("una experiencia no puede tener dos salidas a la misma hora", async () => {
  const startAt = fromNow(40 * DAY);
  const first = await api.post("/departures", body({ startAt, endAt: fromNow(40 * DAY + HOUR) }));
  assert.equal(first.status, 201);

  const same = await api.post("/departures", body({ startAt, endAt: fromNow(40 * DAY + HOUR) }));
  assert.equal(fieldMessage(same, "startAt"), "startAt already has a departure of this experience");

  const other = await api.post("/departures", body({ startAt: fromNow(41 * DAY), endAt: fromNow(41 * DAY + HOUR) }));
  const moved = await api.patch(`/departures/${other.body._id}`, { startAt });
  assert.equal(fieldMessage(moved, "startAt"), "startAt already has a departure of this experience");
});

test("completed solo cuando ya terminó, y una cancelada no se reabre", async () => {
  const created = await api.post("/departures", body({ state: "completed" }));
  assert.equal(fieldMessage(created, "state"), "state cannot be completed before the departure ends");

  const departure = (await api.post("/departures", body({ startAt: fromNow(50 * DAY), endAt: fromNow(50 * DAY + HOUR) }))).body;
  assert.equal((await api.patch(`/departures/${departure._id}`, { state: "cancelled" })).status, 200);

  const reopened = await api.patch(`/departures/${departure._id}`, { state: "scheduled" });
  assert.equal(fieldMessage(reopened, "state"), "state of a cancelled departure cannot be changed");
  assert.equal((await api.patch(`/departures/${departure._id}`, { price: 60 })).status, 200);

  // Una salida que ya terminó: se fuerza en la base de datos, la API no deja crearla en el pasado
  const finished = (await api.post("/departures", body({ startAt: fromNow(60 * DAY), endAt: fromNow(60 * DAY + HOUR) }))).body;
  await Departure.updateOne({ _id: finished._id }, { startAt: new Date(Date.now() - 2 * DAY), endAt: new Date(Date.now() - DAY) });
  assert.equal((await api.patch(`/departures/${finished._id}`, { state: "completed" })).status, 200);
});

test("el precio tiene como mucho dos decimales y 100.000 €", async () => {
  assert.equal(fieldMessage(await api.post("/departures", body({ price: 10.555 })), "price") !== undefined, true);
  assert.equal(
    fieldMessage(await api.post("/departures", body({ price: 100001 })), "price"),
    "price must be less than or equal to 100000"
  );
});

test("plazas reservadas: no se envían, la capacidad no baja de ellas y las libres se calculan", async () => {
  const created = await api.post("/departures", body({ startAt: fromNow(40 * DAY), endAt: fromNow(40 * DAY + 4 * HOUR), capacity: 8 }));
  assert.equal(created.status, 201);
  assert.deepEqual([created.body.seatsBooked, created.body.seatsLeft, created.body.isFull], [0, 8, false]);

  // Las cambiarán las reservas, nunca el body
  assert.equal(fieldMessage(await api.post("/departures", body({ seatsBooked: 2 })), "seatsBooked"), "seatsBooked is not allowed");
  assert.equal(
    fieldMessage(await api.patch(`/departures/${created.body._id}`, { seatsBooked: 2 }), "seatsBooked"),
    "seatsBooked cannot be changed"
  );

  await Departure.updateOne({ _id: created.body._id }, { seatsBooked: 6 });
  const { body: booked } = await api.get(`/departures/${created.body._id}`);
  assert.deepEqual([booked.seatsBooked, booked.seatsLeft, booked.isFull], [6, 2, false]);

  // No se puede dejar con menos plazas de las reservadas; con las justas, completa
  const tooSmall = await api.patch(`/departures/${created.body._id}`, { capacity: 5 });
  assert.equal(tooSmall.status, 409);
  assert.equal(tooSmall.body.message, "capacity is lower than the seats already booked");
  const { body: full } = await api.patch(`/departures/${created.body._id}`, { capacity: 6 });
  assert.deepEqual([full.seatsLeft, full.isFull], [0, true]);

  // ?full=true, las completas; ?full=false, las que tienen plazas
  const ids = async (query) => (await api.get(`/departures?${query}`)).body.map((departure) => departure._id);
  assert.ok((await ids("full=true")).includes(created.body._id));
  assert.ok(!(await ids("full=false")).includes(created.body._id));
  assert.ok((await ids("full=false")).includes(data.departure._id));
});
