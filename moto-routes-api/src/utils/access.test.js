import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canAccessUserResource,
  canModifyDeparture,
  canModifyExperience,
  canModifyHost,
  canModifyImageOwner,
  isOwnerOrAdmin,
} from "./access.js";

// Funciones puras: sin base de datos, con los recursos ya cargados como los dan los services
const ANA = { id: "6710a1b2c3d4e5f6a7b8c910", role: "host" };
const LUIS = { id: "6710a1b2c3d4e5f6a7b8c911", role: "host" };
const ADMIN = { id: "6710a1b2c3d4e5f6a7b8c912", role: "admin" };

// El userId de Mongo llega como ObjectId o como texto: se comparan como texto
const anaHost = { _id: "h1", userId: { toString: () => ANA.id } };
const experience = { _id: "e1", hostId: "h1", host: anaHost };
const departure = { _id: "d1", experienceId: "e1", experience };

test("isOwnerOrAdmin: el dueño (userId) y el admin, nadie más", () => {
  assert.equal(isOwnerOrAdmin(ANA, { userId: ANA.id }), true);
  assert.equal(isOwnerOrAdmin(LUIS, { userId: ANA.id }), false);
  assert.equal(isOwnerOrAdmin(ADMIN, { userId: ANA.id }), true);
});

test("canAccessUserResource: el propio usuario y el admin", () => {
  assert.equal(canAccessUserResource(ANA, { _id: ANA.id }), true);
  assert.equal(canAccessUserResource(LUIS, { _id: ANA.id }), false);
  assert.equal(canAccessUserResource(ADMIN, { _id: ANA.id }), true);
});

test("la cadena host → experiencia → salida lleva siempre al mismo dueño", () => {
  assert.equal(canModifyHost(ANA, anaHost), true);
  assert.equal(canModifyExperience(ANA, experience), true);
  assert.equal(canModifyDeparture(ANA, departure), true);

  assert.equal(canModifyHost(LUIS, anaHost), false);
  assert.equal(canModifyExperience(LUIS, experience), false);
  assert.equal(canModifyDeparture(LUIS, departure), false);

  assert.equal(canModifyDeparture(ADMIN, departure), true);
});

test("sin usuario, sin recurso o con la cadena incompleta, nunca se permite", () => {
  assert.equal(isOwnerOrAdmin(undefined, { userId: ANA.id }), false);
  assert.equal(isOwnerOrAdmin(ANA, null), false);
  assert.equal(isOwnerOrAdmin({ role: "host" }, { userId: undefined }), false);
  // Experiencia cuyo anfitrión está eliminado (no se ha podido cargar)
  assert.equal(canModifyExperience(ANA, { ...experience, host: null }), false);
  assert.equal(canModifyDeparture(ANA, { ...departure, experience: null }), false);
});

test("imágenes: el anfitrión solo toca las de su perfil y sus experiencias", () => {
  assert.equal(canModifyImageOwner(ANA, "host", anaHost), true);
  assert.equal(canModifyImageOwner(ANA, "experience", experience), true);
  assert.equal(canModifyImageOwner(LUIS, "experience", experience), false);
  for (const ownerType of ["route", "category", "location", "user"]) {
    assert.equal(canModifyImageOwner(ANA, ownerType, { userId: ANA.id }), false);
    assert.equal(canModifyImageOwner(ADMIN, ownerType, {}), true);
  }
});
