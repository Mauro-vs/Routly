import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { loadKeys } from "../config/keys.js";
import { PASSWORD, createClient, login, testConfig, testPasswordHash } from "../testing/helpers.js";
import { mongoRepositories } from "./index.js";

/*
 * Los repositorios de verdad contra MongoDB. Solo se ejecuta con TEST_MONGODB_URI (por ejemplo
 * mongodb://localhost:27017): crea una base de datos de usar y tirar (routly_auth_test_xxxx) y la
 * borra al acabar. Nunca toca moto_routes.
 *
 *   TEST_MONGODB_URI=mongodb://localhost:27017 npm test       (PowerShell: $env:TEST_MONGODB_URI="...")
 */
const uri = process.env.TEST_MONGODB_URI;

describe("repositorios de MongoDB", { skip: !uri && "sin TEST_MONGODB_URI" }, () => {
  let server;
  let baseUrl;
  let db;

  before(async () => {
    await mongoose.connect(uri, { dbName: `routly_auth_test_${randomBytes(4).toString("hex")}` });
    db = mongoose.connection.db;
    await mongoose.model("Session").init();
    await mongoose.model("RevokedToken").init();

    const now = new Date();
    const { insertedId: riderRole } = await db.collection("roles").insertOne({ name: "rider", isActive: true, deletedAt: null });
    await db.collection("users").insertOne({
      name: "Rider",
      email: "rider@routly.dev",
      passwordHash: await testPasswordHash(),
      tokenVersion: 0,
      roleId: riderRole,
      status: "active",
      isActive: true,
      slug: "rider-000001",
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const config = testConfig();
    const app = createApp({ config, keys: await loadKeys(config.jwt), repositories: mongoRepositories });
    server = await new Promise((resolve) => {
      const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve) => server?.close(resolve));
    await db?.dropDatabase();
    await mongoose.disconnect();
  });

  it("el registro crea el usuario como lo haría la API, con su perfil", async () => {
    const { status, body } = await createClient(baseUrl).request("/auth/register", {
      method: "POST",
      body: { name: "Ána Nueva", email: "ana@routly.dev", password: "moto-5678" },
    });
    assert.equal(status, 201);

    const user = await db.collection("users").findOne({ email: "ana@routly.dev" });
    assert.equal(String(user._id), body.user.id);
    assert.match(user.slug, /^ana-nueva-[0-9a-f]{6}$/);
    assert.equal(user.status, "active");
    assert.equal(user.isActive, true);
    assert.equal(user.deletedAt, null);
    assert.equal(user.tokenVersion, 0);
    assert.match(user.passwordHash, /^\$argon2id\$/);
    assert.ok(await db.collection("profiles").findOne({ userId: user._id }));
  });

  it("login, me, refresh y logout de principio a fin", async () => {
    const client = createClient(baseUrl);
    assert.equal((await login(client, "rider@routly.dev", PASSWORD)).status, 200);
    assert.equal((await client.request("/auth/me")).body.email, "rider@routly.dev");
    assert.equal((await client.request("/auth/refresh", { method: "POST" })).status, 200);

    const sessions = await db.collection("sessions").find({}).toArray();
    assert.ok(sessions.every((session) => !session.tokenHash.includes(client.cookie("routly_refresh"))));

    assert.equal((await client.request("/auth/logout", { method: "POST" })).status, 204);
    assert.equal(await db.collection("revokedtokens").countDocuments(), 1);
  });

  it("un refresh solo se puede gastar una vez, aunque lleguen dos a la vez", async () => {
    const userId = new mongoose.Types.ObjectId();
    const expiresAt = new Date(Date.now() + 60_000);
    await mongoRepositories.sessions.create({ familyId: "f-1", userId, tokenHash: "h-1", tokenVersion: 0, expiresAt });
    const results = await Promise.all(Array.from({ length: 5 }, () => mongoRepositories.sessions.consume("h-1", new Date())));
    assert.equal(results.filter(Boolean).length, 1);
  });

  it("logout-all sube tokenVersion y borra sus sesiones", async () => {
    const client = createClient(baseUrl);
    await login(client, "rider@routly.dev", PASSWORD);
    assert.equal((await client.request("/auth/logout-all", { method: "POST" })).status, 204);
    const user = await db.collection("users").findOne({ email: "rider@routly.dev" });
    assert.ok(user.tokenVersion >= 1);
    assert.equal(await db.collection("sessions").countDocuments({ userId: user._id }), 0);
  });

  it("sessions tiene el índice TTL, y users no recibe índices del auth", async () => {
    const indexes = await db.collection("sessions").indexes();
    assert.ok(indexes.some((index) => index.key.expiresAt === 1 && index.expireAfterSeconds === 0));
    const userIndexes = await db.collection("users").indexes();
    assert.deepEqual(userIndexes.map((index) => index.name), ["_id_"]);
  });
});
