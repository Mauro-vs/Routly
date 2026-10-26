import { Host } from "../models/host.model.js";
import { toUpdate } from "../utils/update.js";

const withUser = (query) => query.populate("user", "name email");

export const hostRepository = {
  findAll(filter = {}) {
    return withUser(Host.find(filter).sort({ createdAt: -1 })).lean();
  },

  findDeleted() {
    return withUser(Host.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 })).lean();
  },

  findById(id) {
    return withUser(Host.findOne({ _id: id })).lean();
  },

  // Sin relaciones: lo que necesitan las reglas del service antes de escribir
  findPlainById(id) {
    return Host.findOne({ _id: id }).lean();
  },

  findBySlug(slug) {
    return withUser(Host.findOne({ slug })).lean();
  },

  findDeletedById(id) {
    return Host.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  exists(filter) {
    return Host.exists(filter);
  },

  // Incluye los eliminados: un usuario solo puede tener un perfil, también en la papelera
  // Devuelve su deletedAt: así se sabe si el duplicado está en la papelera
  findDuplicateByUser(userId) {
    return Host.findOne({ userId }).select("deletedAt").setOptions({ withDeleted: true }).lean();
  },

  create(data) {
    return Host.create(data);
  },

  updateById(id, data) {
    return Host.findOneAndUpdate({ _id: id }, toUpdate(data), {
      returnDocument: "after",
      runValidators: true,
    }).lean();
  },

  softDeleteById(id) {
    return Host.softDeleteById(id).lean();
  },

  restoreById(id, data) {
    return Host.restoreById(id, data).lean();
  },
};
