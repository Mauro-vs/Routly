import { Route } from "../models/route.model.js";
import { toUpdate } from "../utils/update.js";

// Cada ruta trae su categoría y sus dos ubicaciones, no solo los ids
const withRelations = (query) =>
  query
    .populate("category", "name slug")
    .populate("startLocation", "city region country slug")
    .populate("endLocation", "city region country slug");

export const routeRepository = {
  findAll(filter = {}) {
    return withRelations(Route.find(filter).sort({ createdAt: -1 })).lean();
  },

  // Solo las eliminadas, de la eliminada más reciente a la más antigua. Como el
  // filtro indica deletedAt, el plugin de soft delete no añade deletedAt: null.
  findDeleted() {
    return withRelations(Route.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 })).lean();
  },

  findById(id) {
    return withRelations(Route.findOne({ _id: id })).lean();
  },

  // Sin relaciones: lo que necesitan las reglas del service antes de escribir
  findPlainById(id) {
    return Route.findOne({ _id: id }).lean();
  },

  findBySlug(slug) {
    return withRelations(Route.findOne({ slug })).lean();
  },

  // Para restaurar: hacen falta sus referencias y su deletedAt antes de ponerlo a null
  findDeletedById(id) {
    return Route.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  exists(filter) {
    return Route.exists(filter);
  },

  create(data) {
    return Route.create(data);
  },

  updateById(id, data) {
    return Route.findOneAndUpdate({ _id: id }, toUpdate(data), {
      returnDocument: "after",
      runValidators: true,
    }).lean();
  },

  softDeleteById(id, deletedAt) {
    return Route.softDeleteById(id, deletedAt).lean();
  },

  // Al revés que el resto: solo encuentra documentos eliminados (deletedAt != null)
  restoreById(id, data) {
    return Route.restoreById(id, data).lean();
  },

  // Solo para deshacer un alta que no ha llegado a usarse (su referencia se eliminó a la vez)
  deleteCreatedById(id) {
    return Route.deleteOne({ _id: id });
  },
};
