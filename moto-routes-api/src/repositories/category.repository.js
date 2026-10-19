import mongoose from "mongoose";
import { Category, CATEGORY_COLLATION } from "../models/category.model.js";

const NOT_DELETED = { deletedAt: null };

export const categoryRepository = {
  // Ordenadas por nombre, con el orden alfabético del español
  findAll(filter = {}) {
    return Category.find({ ...filter, ...NOT_DELETED })
      .sort({ name: 1 })
      .collation(CATEGORY_COLLATION)
      .lean();
  },

  findDeleted() {
    return Category.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 }).lean();
  },

  findById(id) {
    return Category.findOne({ _id: id, ...NOT_DELETED }).lean();
  },

  findBySlug(slug) {
    return Category.findOne({ slug, ...NOT_DELETED }).lean();
  },

  findDeletedById(id) {
    return Category.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  // Sin distinguir mayúsculas ni tildes, e incluyendo las eliminadas
  existsByName(name, excludeId) {
    const filter = excludeId ? { name, _id: { $ne: excludeId } } : { name };
    return Category.exists(filter).collation(CATEGORY_COLLATION).setOptions({ withDeleted: true });
  },

  existsBySlug(slug) {
    return Category.exists({ slug }).setOptions({ withDeleted: true });
  },

  generateId() {
    return new mongoose.Types.ObjectId();
  },

  create(data) {
    return Category.create(data);
  },

  updateById(id, data) {
    return Category.findOneAndUpdate({ _id: id, ...NOT_DELETED }, data, {
      returnDocument: "after",
      runValidators: true,
    }).lean();
  },

  softDeleteById(id) {
    return Category.softDeleteById(id).lean();
  },

  restoreById(id, data) {
    return Category.restoreById(id, data).lean();
  },
};
