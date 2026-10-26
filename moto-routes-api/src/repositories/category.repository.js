import { Category, CATEGORY_COLLATION } from "../models/category.model.js";
import { toUpdate } from "../utils/update.js";

export const categoryRepository = {
  // Ordenadas por nombre, con el orden alfabético del español
  findAll(filter = {}) {
    return Category.find(filter)
      .sort({ name: 1 })
      .collation(CATEGORY_COLLATION)
      .lean();
  },

  findDeleted() {
    return Category.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 }).lean();
  },

  findById(id) {
    return Category.findOne({ _id: id }).lean();
  },

  findBySlug(slug) {
    return Category.findOne({ slug }).lean();
  },

  findDeletedById(id) {
    return Category.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  // Sin distinguir mayúsculas ni tildes, e incluyendo las eliminadas
  // Devuelve su deletedAt: así se sabe si el duplicado está en la papelera
  findDuplicateByName(name, excludeId) {
    const filter = excludeId ? { name, _id: { $ne: excludeId } } : { name };
    return Category.findOne(filter)
      .select("deletedAt")
      .collation(CATEGORY_COLLATION)
      .setOptions({ withDeleted: true })
      .lean();
  },

  create(data) {
    return Category.create(data);
  },

  updateById(id, data) {
    return Category.findOneAndUpdate({ _id: id }, toUpdate(data), {
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
