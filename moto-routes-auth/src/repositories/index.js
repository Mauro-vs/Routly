import mongoose from "mongoose";
import { Profile } from "../models/profile.model.js";
import { RevokedToken } from "../models/revokedToken.model.js";
import { Role } from "../models/role.model.js";
import { Session } from "../models/session.model.js";
import { User } from "../models/user.model.js";
import { buildSlug } from "../utils/slugify.js";

/*
 * El acceso a MongoDB, en un solo sitio. Los services solo ven estas funciones, así que los tests
 * las cambian por unas en memoria (src/testing/memoryRepositories.js) con el mismo contrato.
 *
 * Los eliminados de la API (deletedAt) no existen para el auth: cada consulta lo filtra a mano
 * (aquí no está el plugin softDelete de la API).
 */
const alive = { deletedAt: null };

// El usuario con lo que hace falta para decidir si puede entrar: estado, rol y tokenVersion
const withRole = (query) => query.populate({ path: "role", select: "name isActive", match: alive }).lean();

export const userRepository = {
  findForLogin(email) {
    return withRole(User.findOne({ email, ...alive }).select("+passwordHash +tokenVersion"));
  },

  findAuthById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return withRole(User.findOne({ _id: id, ...alive }).select("+tokenVersion"));
  },

  findPasswordHash(id) {
    return User.findOne({ _id: id, ...alive }).select("+passwordHash").lean();
  },

  // También los eliminados: el correo sigue reservado para poder restaurarlos (como en la API)
  async emailTaken(email) {
    return Boolean(await User.exists({ email }));
  },

  async create({ name, email, passwordHash, roleId }) {
    const _id = new mongoose.Types.ObjectId();
    const user = await User.create({ _id, name, email, passwordHash, roleId, slug: buildSlug(name, _id) });
    return { _id: user._id };
  },

  // Solo para deshacer un alta a medias (falló el perfil): nadie la ha usado todavía
  deleteCreated(id) {
    return User.deleteOne({ _id: id });
  },

  updatePasswordHash(id, passwordHash) {
    return User.updateOne({ _id: id, ...alive }, { $set: { passwordHash } });
  },

  // Sube tokenVersion: todos los tokens y refresh ya emitidos dejan de servir
  bumpTokenVersion(id) {
    return User.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } });
  },
};

export const roleRepository = {
  findActiveByName(name) {
    return Role.findOne({ name, isActive: true, ...alive }).lean();
  },
};

export const profileRepository = {
  createEmpty(userId) {
    return Profile.create({ userId, updatedBy: userId });
  },
};

export const sessionRepository = {
  create({ familyId, userId, tokenHash, tokenVersion, expiresAt }) {
    return Session.create({ familyId, userId, tokenHash, tokenVersion, expiresAt });
  },

  /**
   * Gasta un refresh: lo pasa de active a used solo si estaba activo y no ha caducado, en una sola
   * operación atómica (dos peticiones a la vez no pueden gastar el mismo). null si no se pudo.
   */
  consume(tokenHash, now) {
    return Session.findOneAndUpdate(
      { tokenHash, status: "active", expiresAt: { $gt: now } },
      { $set: { status: "used", usedAt: now } },
      { returnDocument: "after" }
    ).lean();
  },

  findByHash(tokenHash) {
    return Session.findOne({ tokenHash }).lean();
  },

  // Revoca todos los refresh de una sesión (los gastados también: ninguno vuelve a valer)
  revokeFamily(familyId, now) {
    return Session.updateMany({ familyId, status: { $ne: "revoked" } }, { $set: { status: "revoked", revokedAt: now } });
  },

  revokeByUser(userId, now) {
    return Session.updateMany({ userId, status: { $ne: "revoked" } }, { $set: { status: "revoked", revokedAt: now } });
  },
};

export const revokedTokenRepository = {
  async isRevoked(jti) {
    return Boolean(await RevokedToken.exists({ jti }));
  },

  // Idempotente: cerrar dos veces la misma sesión no falla ni duplica la entrada
  revoke({ jti, userId, expiresAt }) {
    return RevokedToken.updateOne({ jti }, { $setOnInsert: { jti, userId, expiresAt } }, { upsert: true });
  },
};

export const mongoRepositories = Object.freeze({
  users: userRepository,
  roles: roleRepository,
  profiles: profileRepository,
  sessions: sessionRepository,
  revokedTokens: revokedTokenRepository,
});
