import { Bike } from "../models/bike.model.js";
import { toUpdate } from "../utils/update.js";

const withUser = (query) => query.populate("user", "name slug");

export const bikeRepository = {
  // La moto principal primero, después la más reciente
  findAll(filter = {}) {
    return withUser(Bike.find(filter).sort({ isPrimary: -1, createdAt: -1 })).lean();
  },

  findDeleted() {
    return withUser(Bike.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 })).lean();
  },

  findById(id) {
    return withUser(Bike.findOne({ _id: id })).lean();
  },

  // Sin relaciones: lo que necesitan las reglas del service antes de escribir
  findPlainById(id) {
    return Bike.findOne({ _id: id }).lean();
  },

  findBySlug(slug) {
    return withUser(Bike.findOne({ slug })).lean();
  },

  findDeletedById(id) {
    return Bike.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  exists(filter) {
    return Bike.exists(filter);
  },

  // Los ids que cumplen el filtro (sin los eliminados): para services/visibility.js
  findIds(filter) {
    return Bike.distinct("_id", filter);
  },

  // Lo que se enseña de la moto de un guía en una experiencia o una salida
  findSummaries(ids, filter = {}) {
    return Bike.find({ _id: { $in: ids }, ...filter })
      .select("brand model version type cc hp license slug userId")
      .lean();
  },

  countByUser(userId) {
    return Bike.countDocuments({ userId });
  },

  // La siguiente candidata a moto principal: la activa más antigua del usuario
  findFirstActiveByUser(userId, excludeId) {
    return Bike.findOne({ userId, isActive: true, _id: { $ne: excludeId } }).sort({ createdAt: 1 }).lean();
  },

  // Al eliminarla deja de ser la principal (el índice único incluye las de la papelera)
  clearPrimary(id) {
    return Bike.updateOne({ _id: id }, { isPrimary: false }).setOptions({ withDeleted: true });
  },

  unsetPrimary(userId) {
    return Bike.updateMany({ userId, isPrimary: true }, { isPrimary: false });
  },

  create(data) {
    return Bike.create(data);
  },

  updateById(id, data) {
    return Bike.findOneAndUpdate({ _id: id }, toUpdate(data), {
      returnDocument: "after",
      runValidators: true,
    }).lean();
  },

  softDeleteById(id, deletedAt) {
    return Bike.softDeleteById(id, deletedAt).lean();
  },

  restoreById(id, data) {
    return Bike.restoreById(id, data).lean();
  },

  // Solo para deshacer un alta que no ha llegado a usarse (su usuario se eliminó a la vez)
  deleteCreatedById(id) {
    return Bike.deleteOne({ _id: id });
  },

  // Cascada con su usuario: se marcan con el mismo deletedAt...
  softDeleteByUser(userId, deletedAt) {
    return Bike.updateMany({ userId }, { deletedAt });
  },

  // ...y al restaurarlo vuelven solo esas, no las que se habían eliminado antes a mano
  restoreByUser(userId, deletedAt) {
    return Bike.updateMany({ userId, deletedAt }, { deletedAt: null });
  },
};
