import { statusFromActive } from "../models/status.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { hostRepository } from "../repositories/host.repository.js";
import { roleRepository } from "../repositories/role.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { conflict, fieldError, notFound } from "../utils/errors.js";
import { imageService } from "./image.service.js";
import {
  assertHasChanges,
  assertNoDependents,
  assertReference,
  assertRestorable,
  ensureWritten,
  findExisting,
  findRestorable,
} from "./references.js";

const HOST_ROLE = "host";

export const hostService = {
  async list() {
    return imageService.attachCovers("host", await hostRepository.findAll());
  },

  async listByActive(isActive) {
    return imageService.attachCovers("host", await hostRepository.findAll({ isActive }));
  },

  async listDeleted() {
    return hostRepository.findDeleted();
  },

  async getById(id) {
    const host = await findExisting(hostRepository, id, "Host");
    return imageService.attachCover("host", host);
  },

  async getBySlug(slug) {
    const host = await hostRepository.findBySlug(slug);
    if (!host) throw notFound("Host");
    return imageService.attachCover("host", host);
  },

  async create(data) {
    const user = await assertReference(userRepository, data.userId, "userId", "user");
    const role = await roleRepository.findById(user.roleId);
    if (role?.name !== HOST_ROLE) {
      throw fieldError("userId", "userId must reference a user with the host role");
    }

    if (await hostRepository.existsByUser(data.userId)) {
      throw conflict("This user already has a host profile");
    }

    const { _id } = await hostRepository.create(data);
    return hostService.getById(_id);
  },

  // userId no llega: no se puede cambiar después de crear
  async update(id, data) {
    assertHasChanges(data);

    await hostService.getById(id);
    await hostRepository.updateById(id, data);
    return hostService.getById(id);
  },

  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive) {
    const current = await hostService.getById(id);
    if (current.isActive === isActive) return current;
    return hostService.update(id, { status: statusFromActive(isActive) });
  },

  async remove(id) {
    await hostService.getById(id);
    await assertNoDependents(
      experienceRepository,
      { hostId: id },
      "Cannot delete a host that has experiences"
    );

    const host = ensureWritten(await hostRepository.softDeleteById(id), "Host");
    await imageService.removeByOwner("host", id, host.deletedAt);
  },

  async restore(id, isActive = false) {
    const deleted = await findRestorable(hostRepository, id, "Host");

    await assertRestorable(userRepository, deleted.userId, "userId", "user");

    await hostRepository.restoreById(id, { status: statusFromActive(isActive) });
    await imageService.restoreByOwner("host", id, deleted.deletedAt);
    return hostService.getById(id);
  },
};
