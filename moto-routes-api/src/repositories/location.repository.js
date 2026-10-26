import { Location, LOCATION_COLLATION } from "../models/location.model.js";

const NOT_DELETED = { deletedAt: null };

export const locationRepository = {
  findAll(filter = {}) {
    return Location.find({ ...filter, ...NOT_DELETED })
      .sort({ city: 1 })
      .collation(LOCATION_COLLATION)
      .lean();
  },

  findDeleted() {
    return Location.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 }).lean();
  },

  findById(id) {
    return Location.findOne({ _id: id, ...NOT_DELETED }).lean();
  },

  findBySlug(slug) {
    return Location.findOne({ slug, ...NOT_DELETED }).lean();
  },

  findDeletedById(id) {
    return Location.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  // Ciudad, región y país repetidos, sin distinguir mayúsculas ni tildes e incluyendo
  // las eliminadas. Una región que no se envía cuenta como null.
  existsByPlace({ city, region, country }, excludeId) {
    const filter = { city, region: region ?? null, country };
    if (excludeId) filter._id = { $ne: excludeId };
    return Location.exists(filter).collation(LOCATION_COLLATION).setOptions({ withDeleted: true });
  },

  create(data) {
    return Location.create(data);
  },

  updateById(id, data) {
    return Location.findOneAndUpdate({ _id: id, ...NOT_DELETED }, data, {
      returnDocument: "after",
      runValidators: true,
    }).lean();
  },

  softDeleteById(id) {
    return Location.softDeleteById(id).lean();
  },

  restoreById(id, data) {
    return Location.restoreById(id, data).lean();
  },
};
