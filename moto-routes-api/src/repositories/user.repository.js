import { User } from "../models/user.model.js";
import { toUpdate } from "../utils/update.js";

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

  // Sin relaciones: lo que necesitan las reglas del service antes de escribir
  findPlainById(id) {
    return User.findOne({ _id: id }).lean();
  },

  // Para authenticate: el usuario del token, con su tokenVersion y el name de su rol.
  // No devuelve los eliminados (plugin softDelete)
  findAuthById(id) {
    return User.findOne({ _id: id }).select("+tokenVersion").populate("role", "name").lean();
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
  // Devuelve su deletedAt: así se sabe si el duplicado está en la papelera
  findDuplicateByEmail(email, excludeId) {
    const filter = excludeId ? { email, _id: { $ne: excludeId } } : { email };
    return User.findOne(filter).select("deletedAt").setOptions({ withDeleted: true }).lean();
  },

  create(data) {
    return User.create(data);
  },

  updateById(id, data) {
    return User.findOneAndUpdate({ _id: id }, toUpdate(data), {
      returnDocument: "after",
      runValidators: true,
    }).lean();
  },

  softDeleteById(id) {
    return User.softDeleteById(id).lean();
  },

  // Sube tokenVersion: todos los tokens ya emitidos dejan de servir. También en la
  // papelera, para que restaurar no devuelva la vida a los tokens de antes
  revokeTokens(id) {
    return User.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } }).setOptions({ withDeleted: true });
  },

  restoreById(id, data) {
    return User.restoreById(id, data).lean();
  },
};
