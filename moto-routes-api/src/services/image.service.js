import { STATUS, restoredStatus, statusFromActive } from "../models/status.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { hostRepository } from "../repositories/host.repository.js";
import { imageRepository } from "../repositories/image.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { canModifyImageOwner, isAdminUser } from "../utils/access.js";
import { conflict, fieldError, forbidden, notFound } from "../utils/errors.js";
import {
  assertHasChanges,
  confirmReferences,
  ensureWritten,
  findCurrent,
  findExisting,
  findRestorable,
} from "./references.js";

// La imagen principal (isCover) es la portada de una ruta, la foto de perfil de un
// usuario... Siempre hay como mucho una por dueño, y nunca es una imagen inactiva.

// Pasa a ser principal la primera imagen activa del dueño, si queda alguna
async function promoteNextCover(ownerType, ownerId, excludeId) {
  const next = await imageRepository.findFirstActive(ownerType, ownerId, excludeId);
  if (next) await imageRepository.updateById(next._id, { isCover: true });
}

// "route" → "Route": el nombre del dueño en los mensajes
const ownerName = (ownerType) => ownerType[0].toUpperCase() + ownerType.slice(1);

// El dueño, como referencia para confirmReferences
const ownerReference = ({ ownerType, ownerId }) => ({
  repository: { findById: (id) => imageRepository.findOwner(ownerType, id) },
  id: ownerId,
  field: "ownerId",
  resource: ownerType,
});

// El dueño de una imagen con lo que hace falta para saber de quién es: un usuario, un
// anfitrión, o una experiencia con su anfitrión. El resto solo los gestiona el admin.
async function findOwnerChain(ownerType, ownerId) {
  if (ownerType === "user") return userRepository.findPlainById(ownerId);
  if (ownerType === "host") return hostRepository.findPlainById(ownerId);
  if (ownerType === "experience") {
    const experience = await experienceRepository.findPlainById(ownerId);
    return experience && { ...experience, host: await hostRepository.findPlainById(experience.hostId) };
  }
  return null;
}

// ABAC: el admin, con todas; cada usuario, con su foto; un anfitrión, además, con las de
// su perfil de anfitrión y sus experiencias
async function assertOwnImage(actor, { ownerType, ownerId }) {
  if (isAdminUser(actor)) return;
  if (!canModifyImageOwner(actor, ownerType, await findOwnerChain(ownerType, ownerId))) {
    throw forbidden();
  }
}

export const imageService = {
  // Con ownerType y ownerId devuelve la galería de un dueño, que tiene que estar vivo: las
  // imágenes de algo eliminado no se enseñan (404)
  async list(filter = {}) {
    if (filter.ownerType && !(await imageRepository.findOwner(filter.ownerType, filter.ownerId))) {
      throw notFound(ownerName(filter.ownerType));
    }
    return imageRepository.findAll(filter);
  },

  async listByActive(isActive) {
    return imageRepository.findAll({ isActive });
  },

  async listDeleted() {
    return imageRepository.findDeleted();
  },

  async getById(id) {
    return findExisting(imageRepository, id, "Image");
  },

  // El dueño tiene que existir y no estar eliminado, pero puede estar inactivo:
  // así se preparan las imágenes de una ruta antes de activarla
  async create(data, actor) {
    const { ownerType, ownerId } = data;

    if (!(await imageRepository.findOwner(ownerType, ownerId))) {
      throw fieldError("ownerId", `ownerId must reference an existing ${ownerType}`);
    }
    await assertOwnImage(actor, data);

    const last = await imageRepository.findLastPosition(ownerType, ownerId);
    const position = data.position ?? (last ? last.position + 1 : 0);

    // La primera imagen de un dueño es la principal
    const isCover = data.isCover === true || !(await imageRepository.hasCover(ownerType, ownerId));
    if (isCover) await imageRepository.unsetCover(ownerType, ownerId);

    const image = await imageRepository.create({ ...data, position, isCover });
    // Sin transacciones: el dueño tiene que seguir vivo después de escribir
    await confirmReferences([ownerReference(data)], () => imageRepository.deleteCreatedById(image._id));
    return imageService.getById(image._id);
  },

  async update(id, data, actor) {
    assertHasChanges(data);

    const image = await findCurrent(imageRepository, id, "Image");
    await assertOwnImage(actor, image);
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
      await imageRepository.updateById(id, { isCover: true });
    }
    return imageService.getById(id);
  },

  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive, actor) {
    const current = await findCurrent(imageRepository, id, "Image");
    await assertOwnImage(actor, current);
    if (current.isActive === isActive) return imageService.getById(id);
    return imageService.update(id, { status: statusFromActive(isActive) }, actor);
  },

  async remove(id, actor) {
    const image = await findCurrent(imageRepository, id, "Image");
    await assertOwnImage(actor, image);

    if (image.isCover) await imageRepository.updateById(id, { isCover: false });
    ensureWritten(await imageRepository.softDeleteById(id), "Image");
    if (image.isCover) await promoteNextCover(image.ownerType, image.ownerId, id);
  },

  // Vuelve con el estado que tenía, salvo que se pida otro. No vuelve como principal:
  // solo lo es si su dueño se ha quedado sin ninguna y ella está activa.
  async restore(id, isActive, actor) {
    const deleted = await findRestorable(imageRepository, id, "Image");
    await assertOwnImage(actor, deleted);

    if (!(await imageRepository.findOwner(deleted.ownerType, deleted.ownerId))) {
      throw conflict(`Cannot restore: ownerId references a deleted ${deleted.ownerType}`);
    }

    const restored = ensureWritten(
      await imageRepository.restoreById(id, { ...restoredStatus(isActive), isCover: false }),
      "Image"
    );
    await confirmReferences([ownerReference(deleted)], () =>
      imageRepository.softDeleteById(id, deleted.deletedAt)
    );
    if (restored.isActive && !(await imageRepository.hasCover(deleted.ownerType, deleted.ownerId))) {
      await imageRepository.updateById(id, { isCover: true });
    }
    return imageService.getById(id);
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

  // Cascada con la papelera: las imágenes se eliminan y se restauran con su dueño.
  // cascade() es la pieza que recibe softDeleteWithCascades
  cascade(ownerType, ownerId) {
    return {
      remove: (deletedAt) => imageService.removeByOwner(ownerType, ownerId, deletedAt),
      restore: (deletedAt) => imageService.restoreByOwner(ownerType, ownerId, deletedAt),
    };
  },

  async removeByOwner(ownerType, ownerId, deletedAt) {
    await imageRepository.softDeleteByOwner(ownerType, ownerId, deletedAt);
  },

  async restoreByOwner(ownerType, ownerId, deletedAt) {
    await imageRepository.restoreByOwner(ownerType, ownerId, deletedAt);
  },
};
