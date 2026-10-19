import mongoose from "mongoose";
import { User } from "../models/user.model.js";

const NOT_DELETED = { deletedAt: null };

// passwordHash nunca sale: el modelo lo tiene con select: false
const withRole = (query) => query.populate("role", "name label");

export const userRepository = {
  findAll(filter = {}) {
    return withRole(User.find({ ...filter, ...NOT_DELETED }).sort({ createdAt: -1 })).lean();
  },

  findDeleted() {
    return withRole(User.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 })).lean();
  },

  findById(id) {
    return withRole(User.findOne({ _id: id, ...NOT_DELETED })).lean();
  },

  findBySlug(slug) {
    return withRole(User.findOne({ slug, ...NOT_DELETED })).lean();
  },

  // Para restaurar: hace falta su deletedAt antes de ponerlo a null
  findDeletedById(id) {
    return User.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  exists(filter) {
    return User.exists({ ...filter, ...NOT_DELETED });
  },

  // Incluye los eliminados: el correo sigue reservado para poder restaurarlos
  existsByEmail(email, excludeId) {
    const filter = excludeId ? { email, _id: { $ne: excludeId } } : { email };
    return User.exists(filter).setOptions({ withDeleted: true });
  },

  existsBySlug(slug) {
    return User.exists({ slug }).setOptions({ withDeleted: true });
  },

  generateId() {
    return new mongoose.Types.ObjectId();
  },

  create(data) {
    return User.create(data);
  },

  updateById(id, data) {
    return withRole(
      User.findOneAndUpdate({ _id: id, ...NOT_DELETED }, data, { returnDocument: "after", runValidators: true })
    ).lean();
  },

  softDeleteById(id) {
    return User.softDeleteById(id).lean();
  },

  restoreById(id, data) {
    return User.restoreById(id, data).lean();
  },
};
