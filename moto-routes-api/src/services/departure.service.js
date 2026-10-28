import { restoredStatus, statusFromActive } from "../models/status.js";
import { departureRepository } from "../repositories/departure.repository.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { hostRepository } from "../repositories/host.repository.js";
import { canModifyDeparture, canModifyExperience, isAdminUser } from "../utils/access.js";
import { conflict, fieldError, forbidden, notFound } from "../utils/errors.js";
import { madridDateParts } from "../utils/dates.js";
import { buildSku } from "../utils/sku.js";
import { buildSlug } from "../utils/slugify.js";
import {
  assertHasChanges,
  assertReference,
  assertRestorable,
  confirmReferences,
  ensureWritten,
  findCurrent,
  findExisting,
  findRestorable,
} from "./references.js";
import { assertVisible, scopeFilter } from "./visibility.js";

const SKU_TYPE = "DEP";
const SKU_ATTEMPTS = 3;

// "ruta-del-vino-2026-11-08-c3d4e5": título de la experiencia y día de salida (hora de Madrid)
function departureSlug(experienceTitle, startAt, id) {
  const { year, month, day } = madridDateParts(startAt);
  return buildSlug(`${experienceTitle} ${year}-${month}-${day}`, id);
}

// Las plazas tienen que caber entre el mínimo y el máximo de participantes de la experiencia
function assertCapacity(capacity, experience) {
  if (capacity > experience.maxParticipants) {
    throw fieldError(
      "capacity",
      "capacity must be less than or equal to the experience maxParticipants"
    );
  }
  if (capacity < experience.minParticipants) {
    throw fieldError(
      "capacity",
      "capacity must be greater than or equal to the experience minParticipants"
    );
  }
}

// Una salida cancelada no se reabre, y solo se marca como realizada cuando ya ha terminado
function assertState(state, currentState, endAt) {
  if (currentState === "cancelled" && state !== "cancelled") {
    throw fieldError("state", "state of a cancelled departure cannot be changed");
  }
  if (state === "completed" && endAt > new Date()) {
    throw fieldError("state", "state cannot be completed before the departure ends");
  }
}

// Una experiencia no puede tener dos salidas a la misma hora
async function assertFreeStart(experienceId, startAt, excludeId) {
  const filter = { experienceId, startAt };
  if (excludeId) filter._id = { $ne: excludeId };
  if (await departureRepository.exists(filter)) {
    throw fieldError("startAt", "startAt already has a departure of this experience");
  }
}

// Al crear y al cambiar la fecha: una salida no puede empezar en el pasado
function assertFuture(startAt) {
  if (startAt <= new Date()) {
    throw fieldError("startAt", "startAt must be in the future");
  }
}

// ABAC: el admin, con todas; un anfitrión, solo con las salidas de sus experiencias
async function withHost(experience) {
  return experience && { ...experience, host: await hostRepository.findPlainById(experience.hostId) };
}

async function assertOwnExperience(actor, experience) {
  if (isAdminUser(actor)) return;
  if (!canModifyExperience(actor, await withHost(experience))) throw forbidden();
}

async function assertOwnDeparture(actor, departure) {
  if (isAdminUser(actor)) return;
  const experience = await withHost(await experienceRepository.findPlainById(departure.experienceId));
  if (!canModifyDeparture(actor, { ...departure, experience })) throw forbidden();
}

const experienceReference = (id) => ({
  repository: experienceRepository,
  id,
  field: "experienceId",
  resource: "experience",
});

const isSkuClash = (error) => error?.code === 11000 && error.keyPattern?.sku !== undefined;

export const departureService = {
  // scope (services/visibility.js): en PUBLIC, sin las de una experiencia oculta
  async list(scope) {
    return departureRepository.findAll(await scopeFilter("departure", scope));
  },

  async listByActive(isActive, scope) {
    return departureRepository.findAll({ isActive, ...(await scopeFilter("departure", scope)) });
  },

  async listDeleted() {
    return departureRepository.findDeleted();
  },

  async getById(id, scope) {
    const departure = await findExisting(departureRepository, id, "Departure");
    await assertVisible(departureRepository, "departure", departure, scope, "Departure");
    return departure;
  },

  async getBySlug(slug, scope) {
    const departure = await departureRepository.findBySlug(slug);
    if (!departure) throw notFound("Departure");
    await assertVisible(departureRepository, "departure", departure, scope, "Departure");
    return departure;
  },

  // Llega ya en mayúsculas: lo normaliza skuParamSchema
  async getBySku(sku, scope) {
    const departure = await departureRepository.findBySku(sku);
    if (!departure) throw notFound("Departure");
    await assertVisible(departureRepository, "departure", departure, scope, "Departure");
    return departure;
  },

  async create(data, actor) {
    const experience = await assertReference(
      experienceRepository,
      data.experienceId,
      "experienceId",
      "experience"
    );
    await assertOwnExperience(actor, experience);

    assertFuture(data.startAt);
    assertCapacity(data.capacity, experience);
    assertState(data.state ?? "scheduled", undefined, data.endAt);
    await assertFreeStart(data.experienceId, data.startAt);

    // El slug lleva el sufijo del _id: hay que conocerlo antes de crear
    const _id = departureRepository.generateId();
    const slug = departureSlug(experience.title, data.startAt, _id);

    // El SKU es aleatorio: si coincide con uno existente (casi imposible), se genera otro
    for (let attempt = 1; attempt <= SKU_ATTEMPTS; attempt++) {
      try {
        await departureRepository.create({ ...data, _id, slug, sku: buildSku(SKU_TYPE) });
        // Sin transacciones: la experiencia tiene que seguir viva después de escribir
        await confirmReferences([experienceReference(data.experienceId)], () =>
          departureRepository.deleteCreatedById(_id)
        );
        return departureService.getById(_id);
      } catch (error) {
        if (!isSkuClash(error)) throw error;
      }
    }
    throw new Error(`Could not generate a unique SKU after ${SKU_ATTEMPTS} attempts`);
  },

  // experienceId no llega: no se puede cambiar. El SKU tampoco cambia nunca.
  async update(id, data, actor) {
    assertHasChanges(data);

    const departure = await findCurrent(departureRepository, id, "Departure");
    await assertOwnDeparture(actor, departure);
    const experience = await experienceRepository.findPlainById(departure.experienceId);
    // No debería pasar (una experiencia con salidas no se puede eliminar), pero sin ella
    // no se puede calcular el slug ni comprobar las plazas
    if (!experience) {
      throw conflict("Cannot update: experienceId references a deleted experience");
    }

    if (data.startAt !== undefined) assertFuture(data.startAt);

    const startAt = data.startAt ?? departure.startAt;
    const endAt = data.endAt ?? departure.endAt;
    if (endAt <= startAt) throw fieldError("endAt", "endAt must be after startAt");

    if (data.capacity !== undefined) assertCapacity(data.capacity, experience);
    if (data.state !== undefined || data.endAt !== undefined) {
      assertState(data.state ?? departure.state, departure.state, endAt);
    }
    if (data.startAt !== undefined) {
      await assertFreeStart(departure.experienceId, data.startAt, id);
    }

    // El slug sí sigue a la fecha de salida
    const changes = data.startAt
      ? { ...data, slug: departureSlug(experience.title, data.startAt, id) }
      : data;

    ensureWritten(await departureRepository.updateById(id, changes), "Departure");
    return departureService.getById(id);
  },

  // El slug de una salida lleva el título de su experiencia: si cambia, se rehacen
  // todos, también los de las salidas eliminadas (pueden restaurarse)
  async renameExperience(experienceId, title) {
    const departures = await departureRepository.findAllByExperience(experienceId);
    if (departures.length === 0) return;

    await departureRepository.updateSlugs(
      departures.map(({ _id, startAt }) => ({ _id, slug: departureSlug(title, startAt, _id) }))
    );
  },

  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive, actor) {
    const current = await findCurrent(departureRepository, id, "Departure");
    await assertOwnDeparture(actor, current);
    if (current.isActive === isActive) return departureService.getById(id);
    return departureService.update(id, { status: statusFromActive(isActive) }, actor);
  },

  async remove(id, actor) {
    await assertOwnDeparture(actor, await findCurrent(departureRepository, id, "Departure"));
    ensureWritten(await departureRepository.softDeleteById(id), "Departure");
  },

  async restore(id, isActive, actor) {
    const deleted = await findRestorable(departureRepository, id, "Departure");
    await assertOwnDeparture(actor, deleted);

    await assertRestorable(experienceRepository, deleted.experienceId, "experienceId", "experience");

    await departureRepository.restoreById(id, restoredStatus(isActive));
    await confirmReferences([experienceReference(deleted.experienceId)], () =>
      departureRepository.softDeleteById(id, deleted.deletedAt)
    );
    return departureService.getById(id);
  },
};
