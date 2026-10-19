import { statusFromActive } from "../models/status.js";
import { departureRepository } from "../repositories/departure.repository.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { fieldError, notFound } from "../utils/errors.js";
import { buildSku, madridDateParts } from "../utils/sku.js";
import { buildSlug } from "../utils/slugify.js";
import {
  assertReference,
  assertRestorable,
  assertSlugAvailable,
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
    const departure = await departureRepository.findById(id);
    if (!departure) throw notFound("Departure");
    return departure;
  },

  async getBySlug(slug) {
    const departure = await departureRepository.findBySlug(slug);
    if (!departure) throw notFound("Departure");
    return departure;
  },

  // Se acepta en minúsculas: se guarda siempre en mayúsculas
  async getBySku(sku) {
    const departure = await departureRepository.findBySku(sku.trim().toUpperCase());
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

    if (data.startAt <= new Date()) {
      throw fieldError("startAt", "startAt must be in the future");
    }
    assertCapacity(data.capacity, experience);

    const _id = departureRepository.generateId();
    const slug = departureSlug(experience.title, data.startAt, _id);
    await assertSlugAvailable(departureRepository, slug, "Departure");

    // El SKU es aleatorio: si coincide con uno existente (casi imposible), se genera otro
    for (let attempt = 1; attempt <= SKU_ATTEMPTS; attempt++) {
      try {
        await departureRepository.create({ ...data, _id, slug, sku: buildSku(SKU_TYPE, data.startAt) });
        return departureService.getById(_id);
      } catch (error) {
        if (!isSkuClash(error)) throw error;
      }
    }
    throw new Error(`Could not generate a unique SKU after ${SKU_ATTEMPTS} attempts`);
  },

  // experienceId no llega: no se puede cambiar. El SKU tampoco cambia nunca.
  async update(id, data) {
    const departure = await departureService.getById(id);
    const experience = await experienceRepository.findById(departure.experienceId);

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

  async setActive(id, isActive) {
    return departureService.update(id, { status: statusFromActive(isActive) });
  },

  async remove(id) {
    await departureService.getById(id);
    await departureRepository.softDeleteById(id);
  },

  async restore(id, isActive = false) {
    const deleted = await findRestorable(departureRepository, id, "Departure");

    await assertRestorable(experienceRepository, deleted.experienceId, "experienceId", "experience");

    await departureRepository.restoreById(id, { status: statusFromActive(isActive) });
    return departureService.getById(id);
  },
};
