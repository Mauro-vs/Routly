import { Role } from "../models/role.model.js";

// Solo documentos no eliminados (soft delete)
const NOT_DELETED = { deletedAt: null };

export const roleRepository = {
  findAll(filter = {}) {
    return Role.find({ ...filter, ...NOT_DELETED }).sort({ createdAt: -1 }).lean();
  },

  // La papelera: de la eliminada más reciente a la más antigua
  findDeleted() {
    return Role.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 }).lean();
  },

  findById(id) {
    return Role.findOne({ _id: id, ...NOT_DELETED }).lean();
  },

  findBySlug(slug) {
    return Role.findOne({ slug, ...NOT_DELETED }).lean();
  },

  findDeletedById(id) {
    return Role.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  findByName(name) {
    return Role.findOne({ name, ...NOT_DELETED }).lean();
  },

  // Incluye los eliminados: su nombre y su slug siguen reservados para poder restaurarlos
  existsByName(name) {
    return Role.exists({ name }).setOptions({ withDeleted: true });
  },

  create(data) {
    return Role.create(data);
  },

  updateById(id, data) {
    return Role.findOneAndUpdate({ _id: id, ...NOT_DELETED }, data, {
      returnDocument: "after",
      runValidators: true,
    }).lean();
  },

  softDeleteById(id) {
    return Role.softDeleteById(id).lean();
  },

  restoreById(id, data) {
    return Role.restoreById(id, data).lean();
  },
};
