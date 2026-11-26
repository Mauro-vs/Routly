import { Host } from "../models/host.model.js";
import { toUpdate } from "../utils/update.js";

const withUser = (query) => query.populate("user", "name email");

export const hostRepository = {
  findAll(filter = {}, { sort = { createdAt: -1 }, skip = 0, limit = 0 } = {}) {
    return withUser(Host.find(filter).sort(sort).skip(skip).limit(limit)).lean();
  },

  // El total de un listado paginado (utils/listQuery.js): el mismo filtro, sin los eliminados
  count(filter = {}) {
    return Host.countDocuments(filter);
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

  // Los ids que cumplen el filtro (sin los eliminados): para services/visibility.js
  findIds(filter) {
    return Host.distinct("_id", filter);
  },

  create(data) {
    return Host.create(data);
  },

  /**
   * Guarda sus notas (services/rating.service.js), también si está en la papelera. Sin tocar
   * updatedAt: una opinión nueva no es un cambio de la ficha del anfitrión.
   */
  setRatings(id, ratings) {
    return Host.updateOne({ _id: id }, { $set: ratings }, { timestamps: false }).setOptions({ withDeleted: true });
  },

  // Las notas guardadas de todos (también los de la papelera): para recalcularlas o comprobarlas
  findRatings() {
    return Host.find({}).select("rating experiencesRating").setOptions({ withDeleted: true }).lean();
  },

  updateById(id, data) {
    return Host.findOneAndUpdate({ _id: id }, toUpdate(data), {
      returnDocument: "after",
      runValidators: true,
    }).lean();
  },

  softDeleteById(id, deletedAt) {
    return Host.softDeleteById(id, deletedAt).lean();
  },

  restoreById(id, data) {
    return Host.restoreById(id, data).lean();
  },

  // Solo para deshacer un alta que no ha llegado a usarse (su referencia se eliminó a la vez)
  deleteCreatedById(id) {
    return Host.deleteOne({ _id: id });
  },
};
