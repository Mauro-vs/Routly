// Registra Profile: el populate de profile lo necesita aunque nadie más lo haya importado
import "../models/profile.model.js";
import { User } from "../models/user.model.js";
import { toUpdate } from "../utils/update.js";

// passwordHash y tokenVersion nunca salen: el modelo los tiene con select: false.
// El perfil va siempre dentro del usuario, como profile (el populate necesita su userId)
const withRole = (query) =>
  query.populate("role", "name label").populate("profile", "-__v -deletedAt");

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
    return User.findOne({ _id: id }).select("+tokenVersion").populate("role", "name isActive").lean();
  },

  // Para el login: con el hash y el tokenVersion, que nunca salen en otra consulta
  findForLogin(email) {
    return User.findOne({ email })
      .select("+passwordHash +tokenVersion")
      .populate("role", "name isActive")
      .lean();
  },

  findPasswordHash(id) {
    return User.findOne({ _id: id }).select("+passwordHash").lean();
  },

  // Para check:integrity: los usuarios (también eliminados) que no están en ids
  findWithoutIds(ids) {
    return User.find({ _id: { $nin: ids } })
      .select("email deletedAt")
      .setOptions({ withDeleted: true })
      .lean();
  },

  // Para la regla del último admin
  countActiveByRole(roleId) {
    return User.countDocuments({ roleId, isActive: true });
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

  // Los ids que cumplen el filtro (sin los eliminados): para services/visibility.js
  findIds(filter) {
    return User.distinct("_id", filter);
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

  softDeleteById(id, deletedAt) {
    return User.softDeleteById(id, deletedAt).lean();
  },

  // Un cambio en el perfil también es un cambio del usuario: se ve en su updatedAt
  touch(id) {
    return User.updateOne({ _id: id }, { $set: { updatedAt: new Date() } });
  },

  // Solo para deshacer un alta a medias (falló la creación del perfil): nadie lo ha usado
  deleteCreatedById(id) {
    return User.deleteOne({ _id: id });
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
