import mongoose from "mongoose";
import { Departure } from "../models/departure.model.js";

const NOT_DELETED = { deletedAt: null };

const withExperience = (query) => query.populate("experience", "title slug");

export const departureRepository = {
  // Por fecha de salida, de la más próxima a la más lejana
  findAll(filter = {}) {
    return withExperience(Departure.find({ ...filter, ...NOT_DELETED }).sort({ startAt: 1 })).lean();
  },

  findDeleted() {
    return withExperience(
      Departure.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 })
    ).lean();
  },

  findById(id) {
    return withExperience(Departure.findOne({ _id: id, ...NOT_DELETED })).lean();
  },

  findBySlug(slug) {
    return withExperience(Departure.findOne({ slug, ...NOT_DELETED })).lean();
  },

  findBySku(sku) {
    return withExperience(Departure.findOne({ sku, ...NOT_DELETED })).lean();
  },

  findDeletedById(id) {
    return Departure.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  exists(filter) {
    return Departure.exists({ ...filter, ...NOT_DELETED });
  },

  // Las salidas de una experiencia, también las eliminadas: solo lo que hace falta
  // para rehacer su slug
  findAllByExperience(experienceId) {
    return Departure.find({ experienceId }).select("startAt").setOptions({ withDeleted: true }).lean();
  },

  // Un slug distinto por salida, en una sola operación. bulkWrite no pasa por los
  // plugins: solo cambian slug y updatedAt.
  updateSlugs(slugs) {
    return Departure.bulkWrite(
      slugs.map(({ _id, slug }) => ({ updateOne: { filter: { _id }, update: { $set: { slug } } } }))
    );
  },

  // El slug lleva el sufijo del _id, así que el service lo necesita antes de crear
  generateId() {
    return new mongoose.Types.ObjectId();
  },

  create(data) {
    return Departure.create(data);
  },

  updateById(id, data) {
    return withExperience(
      Departure.findOneAndUpdate({ _id: id, ...NOT_DELETED }, data, {
        returnDocument: "after",
        runValidators: true,
      })
    ).lean();
  },

  softDeleteById(id) {
    return Departure.softDeleteById(id).lean();
  },

  restoreById(id, data) {
    return Departure.restoreById(id, data).lean();
  },
};
