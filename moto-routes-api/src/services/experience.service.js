import { restoredStatus, statusFromActive } from "../models/status.js";
import { departureRepository } from "../repositories/departure.repository.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { hostRepository } from "../repositories/host.repository.js";
import { routeRepository } from "../repositories/route.repository.js";
import { canModifyExperience, canModifyHost, isAdminUser } from "../utils/access.js";
import { conflict, fieldError, forbidden, notFound } from "../utils/errors.js";
import { departureService } from "./departure.service.js";
import { imageService } from "./image.service.js";
import {
  assertHasChanges,
  assertNoDependents,
  assertReference,
  assertRestorable,
  ensureWritten,
  findCurrent,
  findExisting,
  findRestorable,
} from "./references.js";

const REFERENCES = [
  { field: "hostId", repository: hostRepository, resource: "host" },
  { field: "routeId", repository: routeRepository, resource: "route" },
];

// Al crear se comprueban todas; al editar, solo las que cambian
async function assertReferences(data, current = {}) {
  for (const { field, repository, resource } of REFERENCES) {
    if (data[field] !== undefined && data[field] !== String(current[field])) {
      await assertReference(repository, data[field], field, resource);
    }
  }
}

// ABAC: el admin, con todas; un anfitrión, solo con las de su perfil de anfitrión
async function assertOwnHost(actor, hostId) {
  if (isAdminUser(actor)) return;
  if (!canModifyHost(actor, await hostRepository.findPlainById(hostId))) throw forbidden();
}

async function assertOwnExperience(actor, experience) {
  if (isAdminUser(actor)) return;
  const host = await hostRepository.findPlainById(experience.hostId);
  if (!canModifyExperience(actor, { ...experience, host })) throw forbidden();
}

export const experienceService = {
  async list() {
    return experienceRepository.findAll();
  },

  async listByActive(isActive) {
    return experienceRepository.findAll({ isActive });
  },

  async listDeleted() {
    return experienceRepository.findDeleted();
  },

  async getById(id) {
    return findExisting(experienceRepository, id, "Experience");
  },

  async getBySlug(slug) {
    const experience = await experienceRepository.findBySlug(slug);
    if (!experience) throw notFound("Experience");
    return experience;
  },

  async create(data, actor) {
    await assertReferences(data);
    await assertOwnHost(actor, data.hostId);

    const { _id } = await experienceRepository.create(data);
    return experienceService.getById(_id);
  },

  async update(id, data, actor) {
    assertHasChanges(data);

    const experience = await findCurrent(experienceRepository, id, "Experience");
    await assertOwnExperience(actor, experience);
    await assertReferences(data, experience);
    // Un anfitrión no puede pasar su experiencia a otro anfitrión
    if (data.hostId !== undefined) await assertOwnHost(actor, data.hostId);

    // Si solo llega uno de los dos límites, se compara con el guardado
    const minParticipants = data.minParticipants ?? experience.minParticipants;
    const maxParticipants = data.maxParticipants ?? experience.maxParticipants;
    if (maxParticipants < minParticipants) {
      throw fieldError(
        "maxParticipants",
        "maxParticipants must be greater than or equal to minParticipants"
      );
    }

    // No se puede dejar una salida con más plazas que el nuevo máximo
    if (
      data.maxParticipants !== undefined &&
      (await departureRepository.exists({ experienceId: id, capacity: { $gt: data.maxParticipants } }))
    ) {
      throw conflict("maxParticipants is lower than the capacity of an existing departure");
    }

    // Ni con menos plazas que el nuevo mínimo
    const belowMinimum = { experienceId: id, capacity: { $lt: data.minParticipants } };
    if (data.minParticipants !== undefined && (await departureRepository.exists(belowMinimum))) {
      throw conflict("minParticipants is higher than the capacity of an existing departure");
    }

    ensureWritten(await experienceRepository.updateById(id, data), "Experience");
    if (data.title !== undefined && data.title !== experience.title) {
      await departureService.renameExperience(id, data.title);
    }
    return experienceService.getById(id);
  },

  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive, actor) {
    const current = await findCurrent(experienceRepository, id, "Experience");
    await assertOwnExperience(actor, current);
    if (current.isActive === isActive) return experienceService.getById(id);
    return experienceService.update(id, { status: statusFromActive(isActive) }, actor);
  },

  async remove(id, actor) {
    await assertOwnExperience(actor, await findCurrent(experienceRepository, id, "Experience"));
    await assertNoDependents(
      departureRepository,
      { experienceId: id },
      "Cannot delete an experience that has departures"
    );

    const experience = ensureWritten(await experienceRepository.softDeleteById(id), "Experience");
    await imageService.removeByOwner("experience", id, experience.deletedAt);
  },

  async restore(id, isActive, actor) {
    const deleted = await findRestorable(experienceRepository, id, "Experience");
    await assertOwnExperience(actor, deleted);

    for (const { field, repository, resource } of REFERENCES) {
      await assertRestorable(repository, deleted[field], field, resource);
    }

    await experienceRepository.restoreById(id, restoredStatus(isActive));
    await imageService.restoreByOwner("experience", id, deleted.deletedAt);
    return experienceService.getById(id);
  },
};
