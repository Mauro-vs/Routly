import { Role } from "../models/role.model.js";

export const roleRepository = {
  findAll(filter = {}) {
    return Role.find(filter).sort({ createdAt: -1 }).lean();
  },

  // La papelera: de la eliminada más reciente a la más antigua
  findDeleted() {
    return Role.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 }).lean();
  },

  findById(id) {
    return Role.findOne({ _id: id }).lean();
  },

  findBySlug(slug) {
    return Role.findOne({ slug }).lean();
  },

  findDeletedById(id) {
    return Role.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  findByName(name) {
    return Role.findOne({ name }).lean();
  },

  // Incluye los eliminados: su nombre y su slug siguen reservados para poder restaurarlos
  // También entre los eliminados: con su deletedAt se sabe si está en la papelera
  findDuplicateByName(name) {
    return Role.findOne({ name }).select("deletedAt").setOptions({ withDeleted: true }).lean();
  },

  create(data) {
    return Role.create(data);
  },

  updateById(id, data) {
    return Role.findOneAndUpdate({ _id: id }, data, {
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
