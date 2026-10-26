import { restoredStatus, statusFromActive } from "../models/status.js";
import { departureRepository } from "../repositories/departure.repository.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { conflict, fieldError, notFound } from "../utils/errors.js";
import { madridDateParts } from "../utils/dates.js";
import { buildSku } from "../utils/sku.js";
import { buildSlug } from "../utils/slugify.js";
import {
  assertHasChanges,
  assertReference,
  assertRestorable,
  ensureWritten,
  findExisting,
  findRestorable,
} from "./references.js";

const SKU_TYPE = "DEP";
const SKU_ATTEMPTS = 3;

// "ruta-del-vino-2026-11-08-c3d4e5": título de la experiencia y día de salida (hora de Madrid)
function departureSlug(experienceTitle, startAt, id) {
  const { year, month, day } = madridDateParts(startAt);
  return buildSlug(`${experienceTitle} ${year}-${month}-${day}`, id);
}

function assertCapacity(capacity, experience) {
  if (capacity > experience.maxParticipants) {
    throw fieldError(
      "capacity",
      "capacity must be less than or equal to the experience maxParticipants"
    );
  }
}

// Al crear y al cambiar la fecha: una salida no puede empezar en el pasado
function assertFuture(startAt) {
  if (startAt <= new Date()) {
    throw fieldError("startAt", "startAt must be in the future");
  }
}

const isSkuClash = (error) => error?.code === 11000 && error.keyPattern?.sku !== undefined;

export const departureService = {
  async list() {
    return departureRepository.findAll();
  },

  async listByActive(isActive) {
    return departureRepository.findAll({ isActive });
  },

  async listDeleted() {
    return departureRepository.findDeleted();
  },

  async getById(id) {
    const departure = await findExisting(departureRepository, id, "Departure");
    return departure;
  },

  async getBySlug(slug) {
    const departure = await departureRepository.findBySlug(slug);
    if (!departure) throw notFound("Departure");
    return departure;
  },

  // Llega ya en mayúsculas: lo normaliza skuParamSchema
  async getBySku(sku) {
    const departure = await departureRepository.findBySku(sku);
    if (!departure) throw notFound("Departure");
    return departure;
  },

  async create(data) {
    const experience = await assertReference(
      experienceRepository,
      data.experienceId,
      "experienceId",
      "experience"
    );

    assertFuture(data.startAt);
    assertCapacity(data.capacity, experience);

    // El slug lleva el sufijo del _id: hay que conocerlo antes de crear
    const _id = departureRepository.generateId();
    const slug = departureSlug(experience.title, data.startAt, _id);

    // El SKU es aleatorio: si coincide con uno existente (casi imposible), se genera otro
    for (let attempt = 1; attempt <= SKU_ATTEMPTS; attempt++) {
      try {
        await departureRepository.create({ ...data, _id, slug, sku: buildSku(SKU_TYPE) });
        return departureService.getById(_id);
      } catch (error) {
        if (!isSkuClash(error)) throw error;
      }
    }
    throw new Error(`Could not generate a unique SKU after ${SKU_ATTEMPTS} attempts`);
  },

  // experienceId no llega: no se puede cambiar. El SKU tampoco cambia nunca.
  async update(id, data) {
    assertHasChanges(data);

    const departure = await departureService.getById(id);
    const experience = await experienceRepository.findById(departure.experienceId);
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

    // El slug sí sigue a la fecha de salida
    const changes = data.startAt
      ? { ...data, slug: departureSlug(experience.title, data.startAt, id) }
      : data;

    await departureRepository.updateById(id, changes);
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
  async setActive(id, isActive) {
    const current = await departureService.getById(id);
    if (current.isActive === isActive) return current;
    return departureService.update(id, { status: statusFromActive(isActive) });
  },

  async remove(id) {
    await departureService.getById(id);
    ensureWritten(await departureRepository.softDeleteById(id), "Departure");
  },

  async restore(id, isActive) {
    const deleted = await findRestorable(departureRepository, id, "Departure");

    await assertRestorable(experienceRepository, deleted.experienceId, "experienceId", "experience");

    await departureRepository.restoreById(id, restoredStatus(isActive));
    return departureService.getById(id);
  },
};
