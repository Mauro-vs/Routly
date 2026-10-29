import mongoose from "mongoose";
import { Departure } from "../models/departure.model.js";
import { toUpdate } from "../utils/update.js";

// guideBikeId de la experiencia: la salida hereda su moto del guía
const withExperience = (query) => query.populate("experience", "title slug guideBikeId");

export const departureRepository = {
  // Por fecha de salida, de la más próxima a la más lejana
  findAll(filter = {}) {
    return withExperience(Departure.find(filter).sort({ startAt: 1 })).lean();
  },

  findDeleted() {
    return withExperience(
      Departure.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 })
    ).lean();
  },

  findById(id) {
    return withExperience(Departure.findOne({ _id: id })).lean();
  },

  // Sin relaciones: lo que necesitan las reglas del service antes de escribir
  findPlainById(id) {
    return Departure.findOne({ _id: id }).lean();
  },

  findBySlug(slug) {
    return withExperience(Departure.findOne({ slug })).lean();
  },

  findBySku(sku) {
    return withExperience(Departure.findOne({ sku })).lean();
  },

  findDeletedById(id) {
    return Departure.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  exists(filter) {
    return Departure.exists(filter);
  },

  // Las salidas de una experiencia, también las eliminadas: solo lo que hace falta
  // para rehacer su slug
  findAllByExperience(experienceId) {
    return Departure.find({ experienceId })
      .select("startAt")
      .setOptions({ withDeleted: true })
      .lean();
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
    return Departure.findOneAndUpdate({ _id: id }, toUpdate(data), {
      returnDocument: "after",
      runValidators: true,
    }).lean();
  },

  softDeleteById(id, deletedAt) {
    return Departure.softDeleteById(id, deletedAt).lean();
  },

  restoreById(id, data) {
    return Departure.restoreById(id, data).lean();
  },

  // Solo para deshacer un alta que no ha llegado a usarse (su referencia se eliminó a la vez)
  deleteCreatedById(id) {
    return Departure.deleteOne({ _id: id });
  },
};
