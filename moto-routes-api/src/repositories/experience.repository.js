import { Experience } from "../models/experience.model.js";
import { toUpdate } from "../utils/update.js";

const withRelations = (query) =>
  query.populate("host", "name slug").populate("route", "title slug");

export const experienceRepository = {
  findAll(filter = {}) {
    return withRelations(
      Experience.find(filter).sort({ createdAt: -1 })
    ).lean();
  },

  findDeleted() {
    return withRelations(
      Experience.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 })
    ).lean();
  },

  findById(id) {
    return withRelations(Experience.findOne({ _id: id })).lean();
  },

  // Sin relaciones: lo que necesitan las reglas del service antes de escribir
  findPlainById(id) {
    return Experience.findOne({ _id: id }).lean();
  },

  findBySlug(slug) {
    return withRelations(Experience.findOne({ slug })).lean();
  },

  findDeletedById(id) {
    return Experience.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  exists(filter) {
    return Experience.exists(filter);
  },

  // Los ids que cumplen el filtro (sin los eliminados): para services/visibility.js
  findIds(filter) {
    return Experience.distinct("_id", filter);
  },

  create(data) {
    return Experience.create(data);
  },

  updateById(id, data) {
    return Experience.findOneAndUpdate({ _id: id }, toUpdate(data), {
      returnDocument: "after",
      runValidators: true,
    }).lean();
  },

  softDeleteById(id, deletedAt) {
    return Experience.softDeleteById(id, deletedAt).lean();
  },

  restoreById(id, data) {
    return Experience.restoreById(id, data).lean();
  },

  // Solo para deshacer un alta que no ha llegado a usarse (su referencia se eliminó a la vez)
  deleteCreatedById(id) {
    return Experience.deleteOne({ _id: id });
  },
};
