import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Profile } from "../models/profile.model.js";
import { RevokedToken } from "../models/revokedToken.model.js";
import { User } from "../models/user.model.js";
import { profileRepository } from "../repositories/profile.repository.js";
import { userService } from "../services/user.service.js";
import { SYSTEM_ACTOR } from "../utils/access.js";
import { TEST_PASSWORD, fieldMessage, seedBasics, startApi } from "./app.js";

let api;
let data;
let admin;
before(async () => {
  api = await startApi("profile");
  data = await seedBasics(api);
  admin = (await api.get("/profile/me")).body;
});
after(() => api?.stop());

// Un rider nuevo con su sesión, como si se hubiera registrado en el servicio de auth (el registro
// y el login ya no son de la API: los prueba moto-routes-auth)
async function register(email) {
  const response = await api.post("/users", { name: "Rider Nuevo", email, password: TEST_PASSWORD, roleId: data.rider._id });
  const client = await api.loginAs(email);
  return { response: { ...response, body: { user: response.body } }, client };
}

const profilesOf = (userId) => Profile.countDocuments({ userId });

// ---------- sesión ----------

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

test("la contraseña propia ya no se cambia aquí: es del servicio de auth (PATCH /auth/password)", async () => {
  const { client } = await register("clave@example.com");
  const response = await client.patch("/profile/me/password", { currentPassword: TEST_PASSWORD, newPassword: "nuevaclave2" });
  assert.equal(response.status, 404);
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
  // (El registro, en el servicio de auth, también: lo prueba moto-routes-auth)
  const byAdmin = (await api.post("/users", { name: "Por Admin", email: "camino2@example.com", password: TEST_PASSWORD, profile: { city: "Teruel" } })).body;
  const bySeed = await userService.create({ name: "Por Seed", email: "camino3@example.com", password: TEST_PASSWORD }, SYSTEM_ACTOR);

  for (const user of [byAdmin, bySeed]) assert.equal(await profilesOf(user._id), 1);
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
  assert.equal((await api.get("/users")).status, 200);
});
