import { Image } from "../models/image.model.js";
import { IMAGE_OWNERS } from "../models/imageOwners.js";
import { toUpdate } from "../utils/update.js";

export const imageRepository = {
  // Por posición dentro de su dueño
  findAll(filter = {}) {
    return Image.find(filter).sort({ position: 1, createdAt: 1 }).lean();
  },

  findDeleted() {
    return Image.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 }).lean();
  },

  findById(id) {
    return Image.findOne({ _id: id }).lean();
  },

  findDeletedById(id) {
    return Image.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  },

  // El dueño de una imagen, en la colección que indica ownerType (sin los eliminados)
  findOwner(ownerType, ownerId) {
    return IMAGE_OWNERS[ownerType].findOne({ _id: ownerId }).lean();
  },

  // Imagen principal de varios dueños a la vez, para añadir coverImage a un listado
  findCovers(ownerType, ownerIds) {
    return Image.find({
      ownerType,
      ownerId: { $in: ownerIds },
      isCover: true,
      isActive: true,
    })
      .select("ownerId url alt")
      .lean();
  },

  // La siguiente candidata a imagen principal: la primera activa por posición
  findFirstActive(ownerType, ownerId, excludeId) {
    return Image.findOne({ ownerType, ownerId, isActive: true, _id: { $ne: excludeId } })
      .sort({ position: 1, createdAt: 1 })
      .lean();
  },

  findLastPosition(ownerType, ownerId) {
    return Image.findOne({ ownerType, ownerId }).sort({ position: -1 }).lean();
  },

  hasCover(ownerType, ownerId) {
    return Image.exists({ ownerType, ownerId, isCover: true });
  },

  unsetCover(ownerType, ownerId) {
    return Image.updateMany({ ownerType, ownerId, isCover: true }, { isCover: false });
  },

  create(data) {
    return Image.create(data);
  },

  updateById(id, data) {
    return Image.findOneAndUpdate({ _id: id }, toUpdate(data), {
      returnDocument: "after",
      runValidators: true,
    }).lean();
  },

  softDeleteById(id) {
    return Image.softDeleteById(id).lean();
  },

  restoreById(id, data) {
    return Image.restoreById(id, data).lean();
  },

  // Cascada con la papelera: se marcan con el mismo deletedAt que su dueño...
  softDeleteByOwner(ownerType, ownerId, deletedAt) {
    return Image.updateMany({ ownerType, ownerId }, { deletedAt });
  },

  // ...y al restaurarlo vuelven solo esas, no las que se habían eliminado antes a mano.
  // Conservan su estado y su isCover: vuelven tal como estaban.
  restoreByOwner(ownerType, ownerId, deletedAt) {
    return Image.updateMany({ ownerType, ownerId, deletedAt }, { deletedAt: null });
  },
};
