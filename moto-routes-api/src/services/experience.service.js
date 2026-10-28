import { restoredStatus, statusFromActive } from "../models/status.js";
import { departureRepository } from "../repositories/departure.repository.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { hostRepository } from "../repositories/host.repository.js";
import { routeRepository } from "../repositories/route.repository.js";
import { canModifyExperience, canModifyHost, isAdminUser } from "../utils/access.js";
import { conflict, fieldError, forbidden, notFound } from "../utils/errors.js";
import { departureService } from "./departure.service.js";
import { imageService } from "./image.service.js";
import { assertVisible, scopeFilter } from "./visibility.js";
import {
  assertHasChanges,
  assertReference,
  assertRestorable,
  confirmReferences,
  ensureWritten,
  findCurrent,
  findExisting,
  findRestorable,
  softDeleteWithCascades,
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

// Las referencias de data como piezas de confirmReferences (solo las que llegan)
const referencesOf = (data) =>
  REFERENCES.filter(({ field }) => data[field] !== undefined).map(({ field, repository, resource }) => ({
    repository,
    id: data[field],
    field,
    resource,
  }));

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
  // scope (services/visibility.js): en PUBLIC, sin las de un anfitrión o una ruta ocultos
  async list(scope) {
    return experienceRepository.findAll(await scopeFilter("experience", scope));
  },

  async listByActive(isActive, scope) {
    return experienceRepository.findAll({ isActive, ...(await scopeFilter("experience", scope)) });
  },

  async listDeleted() {
    return experienceRepository.findDeleted();
  },

  async getById(id, scope) {
    const experience = await findExisting(experienceRepository, id, "Experience");
    await assertVisible(experienceRepository, "experience", experience, scope, "Experience");
    return experience;
  },

  async getBySlug(slug, scope) {
    const experience = await experienceRepository.findBySlug(slug);
    if (!experience) throw notFound("Experience");
    await assertVisible(experienceRepository, "experience", experience, scope, "Experience");
    return experience;
  },

  async create(data, actor) {
    await assertReferences(data);
    await assertOwnHost(actor, data.hostId);

    const { _id } = await experienceRepository.create(data);
    // Sin transacciones: las referencias tienen que seguir vivas después de escribir
    await confirmReferences(referencesOf(data), () => experienceRepository.deleteCreatedById(_id));
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
    // Las que cambian tienen que seguir vivas; si no, vuelven a las de antes
    const changed = referencesOf(data).filter(({ field }) => data[field] !== String(experience[field]));
    await confirmReferences(changed, () =>
      experienceRepository.updateById(id, Object.fromEntries(changed.map(({ field }) => [field, experience[field]])))
    );
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
    await softDeleteWithCascades({
      repository: experienceRepository,
      id,
      resource: "Experience",
      dependents: [
        {
          repository: departureRepository,
          filter: { experienceId: id },
          message: "Cannot delete an experience that has departures",
        },
      ],
      cascades: [imageService.cascade("experience", id)],
    });
  },

  async restore(id, isActive, actor) {
    const deleted = await findRestorable(experienceRepository, id, "Experience");
    await assertOwnExperience(actor, deleted);

    for (const { field, repository, resource } of REFERENCES) {
      await assertRestorable(repository, deleted[field], field, resource);
    }

    await experienceRepository.restoreById(id, restoredStatus(isActive));
    await imageService.restoreByOwner("experience", id, deleted.deletedAt);
    // Si una referencia se ha eliminado entretanto, vuelve a la papelera con lo suyo
    await confirmReferences(referencesOf(deleted), async () => {
      await imageService.removeByOwner("experience", id, deleted.deletedAt);
      await experienceRepository.softDeleteById(id, deleted.deletedAt);
    });
    return experienceService.getById(id);
  },
};
