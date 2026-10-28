import { ROLES } from "../models/role.model.js";
import { restoredStatus, statusFromActive } from "../models/status.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { hostRepository } from "../repositories/host.repository.js";
import { roleRepository } from "../repositories/role.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { canModifyHost } from "../utils/access.js";
import { conflict, fieldError, forbidden, notFound } from "../utils/errors.js";
import { imageService } from "./image.service.js";
import { assertVisible, scopeFilter } from "./visibility.js";
import {
  assertHasChanges,
  assertNotTaken,
  assertReference,
  confirmReferences,
  ensureWritten,
  findCurrent,
  findExisting,
  findRestorable,
  softDeleteWithCascades,
} from "./references.js";

const HOST_ROLE = ROLES.HOST;

const userReference = (id) => ({ repository: userRepository, id, field: "userId", resource: "user" });

export const hostService = {
  // scope (services/visibility.js): en PUBLIC, sin los anfitriones de un usuario inactivo
  async list(scope) {
    return imageService.attachCovers("host", await hostRepository.findAll(await scopeFilter("host", scope)));
  },

  async listByActive(isActive, scope) {
    const filter = { isActive, ...(await scopeFilter("host", scope)) };
    return imageService.attachCovers("host", await hostRepository.findAll(filter));
  },

  async listDeleted() {
    return hostRepository.findDeleted();
  },

  async getById(id, scope) {
    const host = await findExisting(hostRepository, id, "Host");
    await assertVisible(hostRepository, "host", host, scope, "Host");
    return imageService.attachCover("host", host);
  },

  async getBySlug(slug, scope) {
    const host = await hostRepository.findBySlug(slug);
    if (!host) throw notFound("Host");
    await assertVisible(hostRepository, "host", host, scope, "Host");
    return imageService.attachCover("host", host);
  },

  async create(data) {
    const user = await assertReference(userRepository, data.userId, "userId", "user");
    const role = await roleRepository.findById(user.roleId);
    if (role?.name !== HOST_ROLE) {
      throw fieldError("userId", "userId must reference a user with the host role");
    }

    assertNotTaken(
      await hostRepository.findDuplicateByUser(data.userId),
      "This user already has a host profile"
    );

    const { _id } = await hostRepository.create(data);
    // Sin transacciones: el usuario tiene que seguir vivo después de escribir
    await confirmReferences([userReference(data.userId)], () => hostRepository.deleteCreatedById(_id));
    return hostService.getById(_id);
  },

  // userId no llega: no se puede cambiar después de crear. ABAC: el admin, o el propio
  // anfitrión (crear, activar y eliminar son solo del admin: lo dice la ruta)
  async update(id, data, actor) {
    assertHasChanges(data);

    const host = await findCurrent(hostRepository, id, "Host");
    if (!canModifyHost(actor, host)) throw forbidden();
    ensureWritten(await hostRepository.updateById(id, data), "Host");
    return hostService.getById(id);
  },

  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive, actor) {
    const current = await findCurrent(hostRepository, id, "Host");
    if (current.isActive === isActive) return hostService.getById(id);
    return hostService.update(id, { status: statusFromActive(isActive) }, actor);
  },

  async remove(id) {
    await findCurrent(hostRepository, id, "Host");
    await softDeleteWithCascades({
      repository: hostRepository,
      id,
      resource: "Host",
      dependents: [
        { repository: experienceRepository, filter: { hostId: id }, message: "Cannot delete a host that has experiences" },
      ],
      cascades: [imageService.cascade("host", id)],
    });
  },

  async restore(id, isActive) {
    const deleted = await findRestorable(hostRepository, id, "Host");

    // Su usuario tiene que existir y seguir siendo anfitrión: mientras el host estaba en la
    // papelera se le pudo quitar el rol
    const user = await userRepository.findPlainById(deleted.userId);
    if (!user) throw conflict("Cannot restore: userId references a deleted user");
    const role = await roleRepository.findById(user.roleId);
    if (role?.name !== HOST_ROLE) {
      throw conflict("Cannot restore: userId references a user without the host role");
    }

    await hostRepository.restoreById(id, restoredStatus(isActive));
    await imageService.restoreByOwner("host", id, deleted.deletedAt);
    await confirmReferences([userReference(deleted.userId)], async () => {
      await imageService.removeByOwner("host", id, deleted.deletedAt);
      await hostRepository.softDeleteById(id, deleted.deletedAt);
    });
    return hostService.getById(id);
  },
};
