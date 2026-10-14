import mongoose from "mongoose";
import { Route } from "../models/route.model.js";

// Solo documentos no eliminados (soft delete)
const NOT_DELETED = { deletedAt: null };

export const routeRepository = {
  findAll(filter = {}) {
    return Route.find({ ...filter, ...NOT_DELETED }).sort({ createdAt: -1 }).lean();
  },

  // Solo las eliminadas, de la eliminada más reciente a la más antigua. Como el
  // filtro indica deletedAt, el plugin de soft delete no añade deletedAt: null.
  findDeleted() {
    return Route.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 }).lean();
  },

  findById(id) {
    return Route.findOne({ _id: id, ...NOT_DELETED }).lean();
  },

  findBySlug(slug) {
    return Route.findOne({ slug, ...NOT_DELETED }).lean();
  },

  // Mira también las rutas eliminadas: su slug sigue reservado por el índice único
  existsBySlug(slug) {
    return Route.exists({ slug }).setOptions({ withDeleted: true });
  },

  // El slug lleva el sufijo del _id, así que hay que conocerlo antes de crear
  generateId() {
    return new mongoose.Types.ObjectId();
  },

  create(data) {
    return Route.create(data);
  },

  updateById(id, data) {
    return Route.findOneAndUpdate({ _id: id, ...NOT_DELETED }, data, {
      new: true,
      runValidators: true,
    }).lean();
  },

  softDeleteById(id) {
    return Route.softDeleteById(id).lean();
  },

  // Al revés que el resto: solo encuentra documentos eliminados (deletedAt != null)
  restoreById(id, data) {
    return Route.restoreById(id, data).lean();
  },
};
