import mongoose from "mongoose";
import { Host } from "../models/host.model.js";

const NOT_DELETED = { deletedAt: null };

const withUser = (query) => query.populate("user", "name email");

export const hostRepository = {
  findAll(filter = {}) {
    return withUser(Host.find({ ...filter, ...NOT_DELETED }).sort({ createdAt: -1 })).lean();
  },

  findDeleted() {
    return withUser(Host.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 })).lean();
  },

  findById(id) {
    return withUser(Host.findOne({ _id: id, ...NOT_DELETED })).lean();
  },

  findBySlug(slug) {
    return withUser(Host.findOne({ slug, ...NOT_DELETED })).lean();
  },

  findDeletedById(id) {
    return Host.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  exists(filter) {
    return Host.exists({ ...filter, ...NOT_DELETED });
  },

  // Incluye los eliminados: un usuario solo puede tener un perfil, también en la papelera
  existsByUser(userId) {
    return Host.exists({ userId }).setOptions({ withDeleted: true });
  },

  existsBySlug(slug) {
    return Host.exists({ slug }).setOptions({ withDeleted: true });
  },

  generateId() {
    return new mongoose.Types.ObjectId();
  },

  create(data) {
    return Host.create(data);
  },

  updateById(id, data) {
    return withUser(
      Host.findOneAndUpdate({ _id: id, ...NOT_DELETED }, data, { returnDocument: "after", runValidators: true })
    ).lean();
  },

  softDeleteById(id) {
    return Host.softDeleteById(id).lean();
  },

  restoreById(id, data) {
    return Host.restoreById(id, data).lean();
  },
};
