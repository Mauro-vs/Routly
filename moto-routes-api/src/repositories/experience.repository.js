import { Experience } from "../models/experience.model.js";

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

  findBySlug(slug) {
    return withRelations(Experience.findOne({ slug })).lean();
  },

  findDeletedById(id) {
    return Experience.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  exists(filter) {
    return Experience.exists(filter);
  },

  create(data) {
    return Experience.create(data);
  },

  updateById(id, data) {
    return withRelations(
      Experience.findOneAndUpdate({ _id: id }, data, {
        returnDocument: "after",
        runValidators: true,
      })
    ).lean();
  },

  softDeleteById(id) {
    return Experience.softDeleteById(id).lean();
  },

  restoreById(id, data) {
    return Experience.restoreById(id, data).lean();
  },
};
