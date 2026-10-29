import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import argon2 from "argon2";
import { Profile } from "../models/profile.model.js";
import { RevokedToken } from "../models/revokedToken.model.js";
import { User } from "../models/user.model.js";
import { profileRepository } from "../repositories/profile.repository.js";
import { userService } from "../services/user.service.js";
import { SYSTEM_ACTOR } from "../utils/access.js";
import { ADMIN_EMAIL, TEST_PASSWORD, fieldMessage, seedBasics, startApi } from "./app.js";

const INVALID_LOGIN = { statusCode: 401, error: "Unauthorized", message: "Invalid email or password" };

let api;
let data;
let admin;
before(async () => {
  api = await startApi("profile");
  data = await seedBasics(api);
  admin = (await api.get("/auth/me")).body;
});
after(() => api?.stop());

// Registra un rider y devuelve la sesión y un cliente con su token
async function register(email, extra = {}) {
  const response = await api.anonymous.post("/auth/register", { name: "Rider Nuevo", email, password: TEST_PASSWORD, ...extra });
  return { response, client: api.as(response.body?.token) };
}

const profilesOf = (userId) => Profile.countDocuments({ userId });

// ---------- auth ----------

test("registro: 201 con la sesión, siempre rider y con su perfil vacío", async () => {
  const { response, client } = await register("nuevo@example.com");

  assert.equal(response.status, 201);
  assert.equal(response.body.tokenType, "Bearer");
  assert.equal(typeof response.body.token, "string");
  assert.equal(response.body.expiresIn, 3600);
  assert.equal(response.body.user.role.name, "rider");
  assert.ok(response.body.user.profile);
  assert.equal(await profilesOf(response.body.user._id), 1);
  assert.equal((await client.get("/auth/me")).body.email, "nuevo@example.com");
});

test("registro: no acepta roleId ni profile, y aplica las reglas de la contraseña", async () => {
  const roleId = await register("rol@example.com", { roleId: api.adminRole._id });
  assert.equal(roleId.response.status, 400);
  assert.equal(fieldMessage(roleId.response, "roleId"), "roleId is not allowed");

  assert.equal((await register("perfil@example.com", { profile: { city: "Jaca" } })).response.status, 400);
  assert.equal((await register("debil@example.com", { password: "corta1" })).response.status, 400);
  assert.equal((await register("nuevo@example.com")).response.status, 409);
});

test("login: correcto devuelve la sesión sin hash ni tokenVersion", async () => {
  const response = await api.anonymous.post("/auth/login", { email: "ANA@example.com ", password: TEST_PASSWORD });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.email, "ana@example.com");
  assert.equal(response.body.user.role.name, "host");
  assert.ok(!("passwordHash" in response.body.user) && !("tokenVersion" in response.body.user));
  assert.equal((await api.as(response.body.token).get("/auth/me")).status, 200);
});

test("login: contraseña mal, correo que no existe o cuenta inactiva, el mismo 401", async () => {
  const wrongPassword = await api.anonymous.post("/auth/login", { email: "ana@example.com", password: "otraclave1" });
  const noUser = await api.anonymous.post("/auth/login", { email: "nadie@example.com", password: TEST_PASSWORD });

  const inactive = (await api.post("/users", { name: "Inactiva", email: "inactiva@example.com", password: TEST_PASSWORD })).body;
  await api.patch(`/users/${inactive._id}/active`, { isActive: false });
  const inactiveLogin = await api.anonymous.post("/auth/login", { email: "inactiva@example.com", password: TEST_PASSWORD });

  for (const response of [wrongPassword, noUser, inactiveLogin]) {
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, INVALID_LOGIN);
  }
  // Sin contraseña es un 400 de validación, no un intento de login
  assert.equal((await api.anonymous.post("/auth/login", { email: "ana@example.com" })).status, 400);
});

test("login: un hash con parámetros antiguos se rehace al entrar", async () => {
  const user = (await api.post("/users", { name: "Hash Viejo", email: "viejo@example.com", password: TEST_PASSWORD })).body;
  const oldHash = await argon2.hash(TEST_PASSWORD, { type: argon2.argon2id, memoryCost: 8192, timeCost: 1, parallelism: 1 });
  await User.updateOne({ _id: user._id }, { passwordHash: oldHash });

  assert.equal((await api.anonymous.post("/auth/login", { email: "viejo@example.com", password: TEST_PASSWORD })).status, 200);
  const stored = await User.findById(user._id).select("+passwordHash").lean();
  assert.match(stored.passwordHash, /\$m=19456,p=1,t=2\$/);
});

test("/auth/me y logout-all: sin token 401; logout-all cierra todas las sesiones", async () => {
  assert.equal((await api.anonymous.get("/auth/me")).status, 401);

  const { client } = await register("salir@example.com");
  const me = await client.get("/auth/me");
  assert.equal(me.status, 200);
  assert.ok(me.body.profile);

  assert.equal((await client.post("/auth/logout-all")).status, 204);
  assert.equal((await client.get("/auth/me")).status, 401);
});

test("logout: cierra solo esta sesión; el token deja de servir y las demás siguen", async () => {
  const { response, client } = await register("logout@example.com");
  const other = await api.loginAs("logout@example.com");
  const { jti, exp } = JSON.parse(Buffer.from(client.token.split(".")[1], "base64url"));

  assert.equal((await client.post("/auth/logout")).status, 204);

  const after = await client.get("/auth/me");
  assert.equal(after.status, 401);
  assert.equal(after.body.code, "TOKEN_INVALID");
  // Otra sesión del mismo usuario sigue abierta
  assert.equal((await other.get("/auth/me")).status, 200);
  // Y puede volver a entrar
  assert.equal((await api.anonymous.post("/auth/login", { email: "logout@example.com", password: TEST_PASSWORD })).status, 200);

  // En la lista negra solo va el jti, de quién era y cuándo caduca: nunca el token
  const entry = await RevokedToken.findOne({ jti }).lean();
  assert.equal(String(entry.userId), response.body.user._id);
  assert.equal(entry.expiresAt.getTime(), exp * 1000);
  assert.ok(!Object.values(entry).includes(client.token));
});

test("logout: sin token 401; el mismo token no puede cerrar sesión dos veces", async () => {
  assert.equal((await api.anonymous.post("/auth/logout")).status, 401);

  const { client } = await register("logout2@example.com");
  assert.equal((await client.post("/auth/logout")).status, 204);
  assert.equal((await client.post("/auth/logout")).status, 401);
});

test("la lista negra se vacía sola: índice TTL en expiresAt", async () => {
  const indexes = await RevokedToken.collection.indexes();
  const ttl = indexes.find((index) => index.key.expiresAt === 1);
  assert.equal(ttl.expireAfterSeconds, 0);
  assert.ok(indexes.find((index) => index.key.jti === 1).unique);
});

// ---------- profile ----------

test("GET y PATCH /profile/me: datos del usuario y de su perfil, con updatedBy", async () => {
  const { response, client } = await register("yo@example.com");
  const before = response.body.user;

  const updated = await client.patch("/profile/me", {
    name: "Yo Mismo",
    profile: { city: "Jaca", phone: "+34600111222", birthDate: "1990-05-17", experienceLevel: "advanced", emergencyContact: { name: "Ana", phone: "+34600999888" } },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.name, "Yo Mismo");
  assert.equal(updated.body.profile.city, "Jaca");
  assert.equal(updated.body.profile.birthDate, "1990-05-17T00:00:00.000Z");
  assert.equal(updated.body.profile.updatedBy, before._id);
  assert.ok(new Date(updated.body.updatedAt) > new Date(before.updatedAt));

  // null vacía un campo
  const cleared = await client.patch("/profile/me", { profile: { city: null, emergencyContact: null } });
  assert.equal(cleared.body.profile.city, undefined);
  assert.equal(cleared.body.profile.emergencyContact, undefined);
  assert.equal((await client.get("/profile/me")).body.profile.phone, "+34600111222");
});

test("PATCH /profile/me: ni rol, ni estado, ni contraseña; correo repetido 409; datos no válidos 400", async () => {
  const { client } = await register("limites@example.com");

  for (const body of [{ roleId: api.adminRole._id }, { status: "inactive" }, { password: "otraclave1" }]) {
    const response = await client.patch("/profile/me", body);
    assert.equal(response.status, 400);
    const field = Object.keys(body)[0];
    assert.equal(fieldMessage(response, field), `${field} cannot be changed`);
  }
  assert.equal((await client.patch("/profile/me", { email: "ana@example.com" })).status, 409);
  assert.equal((await client.patch("/profile/me", {})).body.message, "No fields to update");
  assert.equal((await client.patch("/profile/me", { profile: {} })).body.message, "No fields to update");

  const phone = await client.patch("/profile/me", { profile: { phone: "600111222" } });
  assert.equal(fieldMessage(phone, "profile.phone"), "profile.phone has an invalid format");
  const young = await client.patch("/profile/me", { profile: { birthDate: new Date().toISOString().slice(0, 10) } });
  assert.equal(fieldMessage(young, "profile.birthDate"), "birthDate must be at least 14 years ago");
  assert.equal((await client.patch("/profile/me", { profile: { experienceLevel: "pro" } })).status, 400);
});

test("PATCH /profile/me/password: pide la actual, otra distinta, y da un token nuevo", async () => {
  const { client } = await register("clave@example.com");

  const wrong = await client.patch("/profile/me/password", { currentPassword: "noesesta1", newPassword: "nuevaclave2" });
  assert.equal(wrong.status, 400);
  assert.equal(fieldMessage(wrong, "currentPassword"), "currentPassword is incorrect");

  const same = await client.patch("/profile/me/password", { currentPassword: TEST_PASSWORD, newPassword: TEST_PASSWORD });
  assert.equal(fieldMessage(same, "newPassword"), "newPassword must be different from currentPassword");

  const changed = await client.patch("/profile/me/password", { currentPassword: TEST_PASSWORD, newPassword: "nuevaclave2" });
  assert.equal(changed.status, 200);
  assert.equal((await client.get("/auth/me")).status, 401);
  assert.equal((await api.as(changed.body.token).get("/auth/me")).status, 200);
  assert.equal((await api.anonymous.post("/auth/login", { email: "clave@example.com", password: "nuevaclave2" })).status, 200);
});

test("/profile/:userId: el dueño y el admin sí; otro usuario 403; sin token 401", async () => {
  const owner = await register("dueno@example.com");
  const other = await register("otro@example.com");
  const ownerId = owner.response.body.user._id;

  assert.equal((await api.anonymous.get(`/profile/${ownerId}`)).status, 401);
  assert.equal((await owner.client.get(`/profile/${ownerId}`)).status, 200);
  assert.equal((await other.client.get(`/profile/${ownerId}`)).status, 403);
  assert.equal((await other.client.patch(`/profile/${ownerId}`, { profile: { bio: "Hackeado" } })).status, 403);

  const byAdmin = await api.patch(`/profile/${ownerId}`, { profile: { bio: "Revisado por el admin" } });
  assert.equal(byAdmin.status, 200);
  assert.equal(byAdmin.body.profile.updatedBy, admin._id);
  assert.equal((await api.get("/profile/6710a1b2c3d4e5f6a7b8c999")).status, 404);
});

test("no hay rutas para crear ni eliminar un perfil por su cuenta", async () => {
  const { client } = await register("sinrutas@example.com");
  assert.equal((await client.post("/profile", { city: "Jaca" })).status, 404);
  assert.equal((await client.post("/profile/me", { city: "Jaca" })).status, 404);
  assert.equal((await client.patch("/profile/me/delete")).status, 404);
});

// ---------- ciclo de vida del perfil ----------

test("todo camino que crea un usuario crea exactamente un perfil", async () => {
  const registered = (await register("camino1@example.com")).response.body.user;
  const byAdmin = (await api.post("/users", { name: "Por Admin", email: "camino2@example.com", password: TEST_PASSWORD, profile: { city: "Teruel" } })).body;
  const bySeed = await userService.create({ name: "Por Seed", email: "camino3@example.com", password: TEST_PASSWORD }, SYSTEM_ACTOR);

  for (const user of [registered, byAdmin, bySeed]) assert.equal(await profilesOf(user._id), 1);
  assert.equal(byAdmin.profile.city, "Teruel");
  assert.equal(byAdmin.profile.updatedBy, admin._id);
});

test("si falla la creación del perfil, no queda el usuario", async () => {
  const original = profileRepository.create;
  profileRepository.create = async () => {
    throw new Error("profile store down");
  };
  const quiet = console.error;
  console.error = () => {};
  try {
    const response = await api.post("/users", { name: "Huerfano", email: "huerfano@example.com", password: TEST_PASSWORD });
    assert.equal(response.status, 500);
  } finally {
    profileRepository.create = original;
    console.error = quiet;
  }
  assert.equal(await User.countDocuments({ email: "huerfano@example.com" }).setOptions({ withDeleted: true }), 0);
  // Y el correo queda libre
  assert.equal((await api.post("/users", { name: "Huerfano", email: "huerfano@example.com", password: TEST_PASSWORD })).status, 201);
});

test("eliminar y restaurar el usuario arrastra a su perfil; desactivar no lo toca", async () => {
  const user = (await api.post("/users", { name: "Ciclo", email: "ciclo@example.com", password: TEST_PASSWORD, profile: { city: "Soria" } })).body;

  await api.patch(`/users/${user._id}/active`, { isActive: false });
  assert.equal((await Profile.findOne({ userId: user._id }).lean()).deletedAt, null);
  assert.equal((await api.get(`/profile/${user._id}`)).body.profile.city, "Soria");

  await api.patch(`/users/${user._id}/delete`);
  const deletedUser = await User.findById(user._id).setOptions({ withDeleted: true }).lean();
  const deletedProfile = await Profile.findOne({ userId: user._id }).lean();
  assert.equal(deletedProfile.deletedAt.getTime(), deletedUser.deletedAt.getTime());
  assert.equal((await api.get(`/profile/${user._id}`)).status, 404);

  const restored = await api.patch(`/users/${user._id}/restore`);
  assert.equal(restored.body.profile.city, "Soria");
  assert.equal((await Profile.findOne({ userId: user._id }).lean()).deletedAt, null);
});

test("editar solo el perfil desde /api/users actualiza el updatedAt del usuario", async () => {
  const user = (await api.post("/users", { name: "Traza", email: "traza@example.com", password: TEST_PASSWORD })).body;
  const updated = await api.patch(`/users/${user._id}`, { profile: { city: "Albarracín" } });

  assert.equal(updated.status, 200);
  assert.equal(updated.body.profile.city, "Albarracín");
  assert.ok(new Date(updated.body.updatedAt) > new Date(user.updatedAt));
  // El listado de usuarios también lleva el perfil
  const listed = (await api.get("/users")).body.find((item) => item._id === user._id);
  assert.equal(listed.profile.city, "Albarracín");
});

// ---------- el último admin ----------

test("un admin no puede quitarse el rol, desactivarse ni eliminarse a sí mismo", async () => {
  assert.equal((await api.patch(`/users/${admin._id}`, { roleId: data.rider._id })).body.message, "You cannot change your own role");
  assert.equal((await api.patch(`/users/${admin._id}/active`, { isActive: false })).body.message, "You cannot deactivate your own account");
  const remove = await api.patch(`/users/${admin._id}/delete`);
  assert.equal(remove.status, 409);
  assert.equal(remove.body.message, "You cannot delete your own account");
});

test("nunca se queda la plataforma sin un admin activo", async () => {
  // Desde un proceso interno (sin "sí mismo"), sigue protegido
  await assert.rejects(userService.setActive(admin._id, false, SYSTEM_ACTOR), { status: 409, message: "There must be at least one active admin" });
  await assert.rejects(userService.remove(admin._id, SYSTEM_ACTOR), { status: 409 });

  // Con dos admins, uno puede quitar al otro
  const second = (await api.post("/users", { name: "Otra Admin", email: "admin2@example.com", password: TEST_PASSWORD, roleId: api.adminRole._id })).body;
  assert.equal((await api.patch(`/users/${second._id}/active`, { isActive: false })).status, 200);
  await assert.rejects(userService.update(admin._id, { roleId: String(data.rider._id) }, SYSTEM_ACTOR), { status: 409 });
  assert.equal((await api.anonymous.post("/auth/login", { email: ADMIN_EMAIL, password: TEST_PASSWORD })).status, 200);
});
