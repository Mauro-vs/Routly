import { Location, LOCATION_COLLATION } from "../models/location.model.js";
import { toUpdate } from "../utils/update.js";

export const locationRepository = {
  findAll(filter = {}) {
    return Location.find(filter)
      .sort({ city: 1 })
      .collation(LOCATION_COLLATION)
      .lean();
  },

  findDeleted() {
    return Location.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 }).lean();
  },

  findById(id) {
    return Location.findOne({ _id: id }).lean();
  },

  findBySlug(slug) {
    return Location.findOne({ slug }).lean();
  },

  findDeletedById(id) {
    return Location.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  // Ciudad, región y país repetidos, sin distinguir mayúsculas ni tildes e incluyendo
  // las eliminadas. Una región que no se envía cuenta como null.
  // Devuelve su deletedAt: así se sabe si el duplicado está en la papelera
  findDuplicateByPlace({ city, region, country }, excludeId) {
    const filter = { city, region: region ?? null, country };
    if (excludeId) filter._id = { $ne: excludeId };
    return Location.findOne(filter)
      .select("deletedAt")
      .collation(LOCATION_COLLATION)
      .setOptions({ withDeleted: true })
      .lean();
  },

  // Los ids que cumplen el filtro (sin los eliminados): para services/visibility.js
  findIds(filter) {
    return Location.distinct("_id", filter);
  },

  create(data) {
    return Location.create(data);
  },

  updateById(id, data) {
    return Location.findOneAndUpdate({ _id: id }, toUpdate(data), {
      returnDocument: "after",
      runValidators: true,
    }).lean();
  },

  softDeleteById(id, deletedAt) {
    return Location.softDeleteById(id, deletedAt).lean();
  },

  restoreById(id, data) {
    return Location.restoreById(id, data).lean();
  },
};
