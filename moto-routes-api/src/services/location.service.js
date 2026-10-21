import { statusFromActive } from "../models/status.js";
import { locationRepository } from "../repositories/location.repository.js";
import { routeRepository } from "../repositories/route.repository.js";
import { conflict, notFound } from "../utils/errors.js";
import { buildSlug } from "../utils/slugify.js";
import { imageService } from "./image.service.js";
import {
  assertHasChanges,
  assertNoDependents,
  assertSlugAvailable,
  ensureWritten,
  findExisting,
  findRestorable,
} from "./references.js";

const DUPLICATED = "A location with this city, region and country already exists";
const DEFAULT_COUNTRY = "España";

// La API recibe latitude y longitude; se guardan como punto GeoJSON [longitud, latitud]
function toDocument({ latitude, longitude, ...data }) {
  if (latitude === undefined) return data;
  return { ...data, coordinates: { type: "Point", coordinates: [longitude, latitude] } };
}

// Y se devuelven otra vez como latitude y longitude
function toResponse(location) {
  if (!location) return location;
  const { coordinates, ...data } = location;
  if (!coordinates) return data;
  const [longitude, latitude] = coordinates.coordinates;
  return { ...data, latitude, longitude };
}

export const locationService = {
  async list() {
    return (await locationRepository.findAll()).map(toResponse);
  },

  async listByActive(isActive) {
    return (await locationRepository.findAll({ isActive })).map(toResponse);
  },

  async listDeleted() {
    return (await locationRepository.findDeleted()).map(toResponse);
  },

  async getById(id) {
    const location = await findExisting(locationRepository, id, "Location");
    return toResponse(location);
  },

  async getBySlug(slug) {
    const location = await locationRepository.findBySlug(slug);
    if (!location) throw notFound("Location");
    return toResponse(location);
  },

  async create(data) {
    const place = { city: data.city, region: data.region, country: data.country ?? DEFAULT_COUNTRY };
    if (await locationRepository.existsByPlace(place)) throw conflict(DUPLICATED);

    const _id = locationRepository.generateId();
    await assertSlugAvailable(locationRepository, buildSlug(data.city, _id), "Location");

    await locationRepository.create({ ...toDocument(data), _id });
    return locationService.getById(_id);
  },

  async update(id, data) {
    assertHasChanges(data);

    const location = await locationService.getById(id);

    if (data.city !== undefined || data.region !== undefined || data.country !== undefined) {
      const place = {
        city: data.city ?? location.city,
        region: data.region ?? location.region,
        country: data.country ?? location.country,
      };
      if (await locationRepository.existsByPlace(place, id)) throw conflict(DUPLICATED);
    }

    return toResponse(
      ensureWritten(await locationRepository.updateById(id, toDocument(data)), "Location")
    );
  },

  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive) {
    const current = await locationService.getById(id);
    if (current.isActive === isActive) return current;
    return locationService.update(id, { status: statusFromActive(isActive) });
  },

  async remove(id) {
    await locationService.getById(id);
    await assertNoDependents(
      routeRepository,
      { $or: [{ startLocationId: id }, { endLocationId: id }] },
      "Cannot delete a location that is used by routes"
    );

    const location = ensureWritten(await locationRepository.softDeleteById(id), "Location");
    await imageService.removeByOwner("location", id, location.deletedAt);
  },

  async restore(id, isActive = false) {
    const deleted = await findRestorable(locationRepository, id, "Location");

    const location = ensureWritten(
      await locationRepository.restoreById(id, { status: statusFromActive(isActive) }),
      "Location"
    );
    await imageService.restoreByOwner("location", id, deleted.deletedAt);
    return toResponse(location);
  },
};
