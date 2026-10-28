import { restoredStatus, statusFromActive } from "../models/status.js";
import { locationRepository } from "../repositories/location.repository.js";
import { routeRepository } from "../repositories/route.repository.js";
import { notFound } from "../utils/errors.js";
import { imageService } from "./image.service.js";
import {
  assertHasChanges,
  assertNotTaken,
  softDeleteWithCascades,
  ensureWritten,
  findCurrent,
  findExisting,
  findRestorable,
} from "./references.js";

const DUPLICATED = "A location with this city, region and country already exists";
const DEFAULT_COUNTRY = "España";

// La API recibe latitude y longitude; se guardan como punto GeoJSON [longitud, latitud].
// Las dos a null (solo al editar) quitan las coordenadas.
function toDocument({ latitude, longitude, ...data }) {
  if (latitude === undefined) return data;
  if (latitude === null) return { ...data, coordinates: null };
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
    assertNotTaken(await locationRepository.findDuplicateByPlace(place), DUPLICATED);

    const { _id } = await locationRepository.create(toDocument(data));
    return locationService.getById(_id);
  },

  async update(id, data) {
    assertHasChanges(data);

    const location = await findCurrent(locationRepository, id, "Location");

    if (data.city !== undefined || data.region !== undefined || data.country !== undefined) {
      // region a null es "sin región", no "la que tenía"
      const place = {
        city: data.city ?? location.city,
        region: data.region === undefined ? location.region : data.region,
        country: data.country ?? location.country,
      };
      assertNotTaken(await locationRepository.findDuplicateByPlace(place, id), DUPLICATED);
    }

    ensureWritten(await locationRepository.updateById(id, toDocument(data)), "Location");
    return locationService.getById(id);
  },

  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive) {
    const current = await findCurrent(locationRepository, id, "Location");
    if (current.isActive === isActive) return locationService.getById(id);
    return locationService.update(id, { status: statusFromActive(isActive) });
  },

  async remove(id) {
    await findCurrent(locationRepository, id, "Location");
    await softDeleteWithCascades({
      repository: locationRepository,
      id,
      resource: "Location",
      dependents: [
        {
          repository: routeRepository,
          filter: { $or: [{ startLocationId: id }, { endLocationId: id }] },
          message: "Cannot delete a location that is used by routes",
        },
      ],
      cascades: [imageService.cascade("location", id)],
    });
  },

  async restore(id, isActive) {
    const deleted = await findRestorable(locationRepository, id, "Location");

    const location = ensureWritten(
      await locationRepository.restoreById(id, restoredStatus(isActive)),
      "Location"
    );
    await imageService.restoreByOwner("location", id, deleted.deletedAt);
    return toResponse(location);
  },
};
