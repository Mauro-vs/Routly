import { STATUS, statusFromActive } from "../models/status.js";
import { imageRepository } from "../repositories/image.repository.js";
import { conflict, fieldError } from "../utils/errors.js";
import { assertHasChanges, ensureWritten, findExisting, findRestorable } from "./references.js";

// La imagen principal (isCover) es la portada de una ruta, la foto de perfil de un
// usuario... Siempre hay como mucho una por dueño, y nunca es una imagen inactiva.

// Pasa a ser principal la primera imagen activa del dueño, si queda alguna
async function promoteNextCover(ownerType, ownerId, excludeId) {
  const next = await imageRepository.findFirstActive(ownerType, ownerId, excludeId);
  if (next) await imageRepository.updateById(next._id, { isCover: true });
}

export const imageService = {
  // Con ownerType y ownerId devuelve la galería de un dueño
  async list(filter = {}) {
    return imageRepository.findAll(filter);
  },

  async listByActive(isActive) {
    return imageRepository.findAll({ isActive });
  },

  async listDeleted() {
    return imageRepository.findDeleted();
  },

  async getById(id) {
    const image = await findExisting(imageRepository, id, "Image");
    return image;
  },

  // El dueño tiene que existir y no estar eliminado, pero puede estar inactivo:
  // así se preparan las imágenes de una ruta antes de activarla
  async create(data) {
    const { ownerType, ownerId } = data;

    if (!(await imageRepository.findOwner(ownerType, ownerId))) {
      throw fieldError("ownerId", `ownerId must reference an existing ${ownerType}`);
    }

    const last = await imageRepository.findLastPosition(ownerType, ownerId);
    const position = data.position ?? (last ? last.position + 1 : 0);

    // La primera imagen de un dueño es la principal
    const isCover = data.isCover === true || !(await imageRepository.hasCover(ownerType, ownerId));
    if (isCover) await imageRepository.unsetCover(ownerType, ownerId);

    const image = await imageRepository.create({ ...data, position, isCover });
    return imageService.getById(image._id);
  },

  async update(id, data) {
    assertHasChanges(data);

    const image = await imageService.getById(id);
    const { ownerType, ownerId } = image;
    const willBeActive = data.status ? data.status === STATUS.ACTIVE : image.isActive;

    if (data.isCover === true) {
      if (!willBeActive) throw conflict("Inactive images cannot be the cover");
      await imageRepository.unsetCover(ownerType, ownerId);
    }

    // Una imagen que se desactiva deja de ser la principal
    const changes = willBeActive ? data : { ...data, isCover: false };
    const updated = ensureWritten(await imageRepository.updateById(id, changes), "Image");

    if (image.isCover && !updated.isCover) await promoteNextCover(ownerType, ownerId, id);
    if (!image.isActive && updated.isActive && !(await imageRepository.hasCover(ownerType, ownerId))) {
      return imageRepository.updateById(id, { isCover: true });
    }
    return updated;
  },

  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive) {
    const current = await imageService.getById(id);
    if (current.isActive === isActive) return current;
    return imageService.update(id, { status: statusFromActive(isActive) });
  },

  async remove(id) {
    const image = await imageService.getById(id);

    if (image.isCover) await imageRepository.updateById(id, { isCover: false });
    ensureWritten(await imageRepository.softDeleteById(id), "Image");
    if (image.isCover) await promoteNextCover(image.ownerType, image.ownerId, id);
  },

  async restore(id, isActive = false) {
    const status = statusFromActive(isActive);
    const deleted = await findRestorable(imageRepository, id, "Image");

    if (!(await imageRepository.findOwner(deleted.ownerType, deleted.ownerId))) {
      throw conflict(`Cannot restore: ownerId references a deleted ${deleted.ownerType}`);
    }

    const restored = ensureWritten(
      await imageRepository.restoreById(id, { status, isCover: false }),
      "Image"
    );
    if (restored.isActive && !(await imageRepository.hasCover(deleted.ownerType, deleted.ownerId))) {
      return imageRepository.updateById(id, { isCover: true });
    }
    return restored;
  },

  // ---- Para los services de los dueños ----

  // Añade coverImage ({ _id, url, alt } o null) a uno o varios documentos
  async attachCovers(ownerType, documents) {
    if (documents.length === 0) return documents;

    const covers = await imageRepository.findCovers(
      ownerType,
      documents.map((document) => document._id)
    );
    const byOwner = new Map(
      covers.map(({ ownerId, ...cover }) => [String(ownerId), cover])
    );

    return documents.map((document) => ({
      ...document,
      coverImage: byOwner.get(String(document._id)) ?? null,
    }));
  },

  async attachCover(ownerType, document) {
    const [withCover] = await imageService.attachCovers(ownerType, [document]);
    return withCover;
  },

  // Cascada con la papelera: las imágenes se eliminan y se restauran con su dueño
  async removeByOwner(ownerType, ownerId, deletedAt) {
    await imageRepository.softDeleteByOwner(ownerType, ownerId, deletedAt);
  },

  async restoreByOwner(ownerType, ownerId, deletedAt) {
    await imageRepository.restoreByOwner(ownerType, ownerId, deletedAt);
  },
};
