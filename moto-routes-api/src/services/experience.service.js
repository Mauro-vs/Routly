import { restoredStatus, statusFromActive } from "../models/status.js";
import { departureRepository } from "../repositories/departure.repository.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { hostRepository } from "../repositories/host.repository.js";
import { routeRepository } from "../repositories/route.repository.js";
import { conflict, fieldError, notFound } from "../utils/errors.js";
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

  async create(data) {
    await assertReferences(data);

    const { _id } = await experienceRepository.create(data);
    return experienceService.getById(_id);
  },

  async update(id, data) {
    assertHasChanges(data);

    const experience = await findCurrent(experienceRepository, id, "Experience");
    await assertReferences(data, experience);

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
  async setActive(id, isActive) {
    const current = await findCurrent(experienceRepository, id, "Experience");
    if (current.isActive === isActive) return experienceService.getById(id);
    return experienceService.update(id, { status: statusFromActive(isActive) });
  },

  async remove(id) {
    await findCurrent(experienceRepository, id, "Experience");
    await assertNoDependents(
      departureRepository,
      { experienceId: id },
      "Cannot delete an experience that has departures"
    );

    const experience = ensureWritten(await experienceRepository.softDeleteById(id), "Experience");
    await imageService.removeByOwner("experience", id, experience.deletedAt);
  },

  async restore(id, isActive) {
    const deleted = await findRestorable(experienceRepository, id, "Experience");

    for (const { field, repository, resource } of REFERENCES) {
      await assertRestorable(repository, deleted[field], field, resource);
    }

    await experienceRepository.restoreById(id, restoredStatus(isActive));
    await imageService.restoreByOwner("experience", id, deleted.deletedAt);
    return experienceService.getById(id);
  },
};
