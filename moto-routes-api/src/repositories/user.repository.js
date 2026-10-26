import { User } from "../models/user.model.js";

// passwordHash nunca sale: el modelo lo tiene con select: false
const withRole = (query) => query.populate("role", "name label");

export const userRepository = {
  findAll(filter = {}) {
    return withRole(User.find(filter).sort({ createdAt: -1 })).lean();
  },

  findDeleted() {
    return withRole(User.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 })).lean();
  },

  findById(id) {
    return withRole(User.findOne({ _id: id })).lean();
  },

  findBySlug(slug) {
    return withRole(User.findOne({ slug })).lean();
  },

  // Para restaurar: hace falta su deletedAt antes de ponerlo a null
  findDeletedById(id) {
    return User.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  exists(filter) {
    return User.exists(filter);
  },

  // Incluye los eliminados: el correo sigue reservado para poder restaurarlos
  // También entre los eliminados: con su deletedAt se sabe si está en la papelera
  findDuplicateByEmail(email, excludeId) {
    const filter = excludeId ? { email, _id: { $ne: excludeId } } : { email };
    return User.findOne(filter).select("deletedAt").setOptions({ withDeleted: true }).lean();
  },

  create(data) {
    return User.create(data);
  },

  updateById(id, data) {
    return withRole(
      User.findOneAndUpdate({ _id: id }, data, { returnDocument: "after", runValidators: true })
    ).lean();
  },

  softDeleteById(id) {
    return User.softDeleteById(id).lean();
  },

  restoreById(id, data) {
    return User.restoreById(id, data).lean();
  },
};
