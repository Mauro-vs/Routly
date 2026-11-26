import { Review } from "../models/review.model.js";
import { toUpdate } from "../utils/update.js";

// Del autor solo se enseña el nombre (nunca el email); su foto la añade el service
const withUser = (query) => query.populate("user", "name slug");

export const reviewRepository = {
  // Las más recientes primero
  findAll(filter = {}, { sort = { createdAt: -1 }, skip = 0, limit = 0 } = {}) {
    return withUser(Review.find(filter).sort(sort).skip(skip).limit(limit)).lean();
  },

  // El total de un listado paginado (utils/listQuery.js): el mismo filtro, sin los eliminados
  count(filter = {}) {
    return Review.countDocuments(filter);
  },

  findDeleted() {
    return withUser(Review.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 })).lean();
  },

  findById(id) {
    return withUser(Review.findOne({ _id: id })).lean();
  },

  // Sin relaciones: lo que necesitan las reglas del service antes de escribir
  findPlainById(id) {
    return Review.findOne({ _id: id }).lean();
  },

  findDeletedById(id) {
    return Review.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  // La opinión de un usuario sobre un objetivo (sin las de la papelera), o null
  findByUserAndTarget(userId, targetType, targetId) {
    return withUser(Review.findOne({ userId, targetType, targetId })).lean();
  },

  exists(filter) {
    return Review.exists(filter);
  },

  /**
   * Cuántas opiniones de cada nota cumplen el filtro, con $group en MongoDB: a Node solo llegan
   * cinco filas como mucho. Solo las visibles y no eliminadas (aggregate no pasa por el plugin de
   * soft delete: deletedAt se filtra a mano).
   *
   * @returns [{ _id: nota, count }]
   */
  countByRating(filter) {
    const match = Review.find().cast(Review, { ...filter, isActive: true, deletedAt: null });
    return Review.aggregate([{ $match: match }, { $group: { _id: "$rating", count: { $sum: 1 } } }]);
  },

  create(data) {
    return Review.create(data);
  },

  updateById(id, data) {
    return Review.findOneAndUpdate({ _id: id }, toUpdate(data), {
      returnDocument: "after",
      runValidators: true,
    }).lean();
  },

  /**
   * Añade una foto a la opinión de ese usuario solo si todavía cabe: la condición (que no exista la
   * foto número max) y el $push van en la misma escritura, así dos subidas a la vez no pasan de max.
   * null si no es suya, no existe o ya está llena.
   */
  addPhoto(id, userId, photo, max) {
    return Review.findOneAndUpdate(
      { _id: id, userId, [`photos.${max - 1}`]: { $exists: false } },
      { $push: { photos: photo } },
      { returnDocument: "after" },
    ).lean();
  },

  // Quita una foto. Devuelve la opinión de antes (con la foto, para borrar su archivo) o null
  removePhoto(id, photoId) {
    return Review.findOneAndUpdate(
      { _id: id, "photos._id": photoId },
      { $pull: { photos: { _id: photoId } } },
      { returnDocument: "before" },
    ).lean();
  },

  softDeleteById(id, deletedAt) {
    return Review.softDeleteById(id, deletedAt).lean();
  },

  restoreById(id, data) {
    return Review.restoreById(id, data).lean();
  },

  // Solo para deshacer un alta que no ha llegado a usarse (su objetivo se eliminó a la vez)
  deleteCreatedById(id) {
    return Review.deleteOne({ _id: id });
  },
};
