import { restoredStatus, statusFromActive } from "../models/status.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { locationRepository } from "../repositories/location.repository.js";
import { routeRepository } from "../repositories/route.repository.js";
import { notFound } from "../utils/errors.js";
import { imageService } from "./image.service.js";
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

// Cada referencia de la ruta: el campo, su repositorio y el recurso para los mensajes
const REFERENCES = [
  { field: "categoryId", repository: categoryRepository, resource: "category" },
  { field: "startLocationId", repository: locationRepository, resource: "location" },
  { field: "endLocationId", repository: locationRepository, resource: "location" },
];

// Comprueba las referencias que llegan en la petición: tienen que estar activas.
// Al editar, solo las que cambian (una categoría desactivada después no bloquea la ruta).
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

// Los datos llegan ya validados y limpios por los esquemas de Zod
// (src/schemas/route.schema.js), aplicados en las rutas con validate().
export const routeService = {
  async list() {
    return imageService.attachCovers("route", await routeRepository.findAll());
  },

  // Las rutas eliminadas nunca aparecen, tampoco entre las inactivas
  async listByActive(isActive) {
    return imageService.attachCovers("route", await routeRepository.findAll({ isActive }));
  },

  // La papelera: solo rutas eliminadas. Es la única consulta que las devuelve.
  async listDeleted() {
    return routeRepository.findDeleted();
  },

  async getById(id) {
    const route = await findExisting(routeRepository, id, "Route");
    return imageService.attachCover("route", route);
  },

  async getBySlug(slug) {
    const route = await routeRepository.findBySlug(slug);
    if (!route) throw notFound("Route");
    return imageService.attachCover("route", route);
  },

  // El slug lo calcula el modelo con el título y el _id. Si dos altas chocaran, el
  // índice único responde con un 409.
  async create(data) {
    await assertReferences(data);

    const { _id } = await routeRepository.create(data);
    // Sin transacciones: las referencias tienen que seguir vivas después de escribir
    await confirmReferences(referencesOf(data), () => routeRepository.deleteCreatedById(_id));
    return routeService.getById(_id);
  },

  async update(id, data) {
    assertHasChanges(data);

    const route = await findCurrent(routeRepository, id, "Route");
    await assertReferences(data, route);

    ensureWritten(await routeRepository.updateById(id, data), "Route");
    // Las que cambian tienen que seguir vivas; si no, vuelven a las de antes
    const changed = referencesOf(data).filter(({ field }) => data[field] !== String(route[field]));
    await confirmReferences(changed, () =>
      routeRepository.updateById(id, Object.fromEntries(changed.map(({ field }) => [field, route[field]])))
    );
    return routeService.getById(id);
  },

  // Activar o desactivar no toca deletedAt: es independiente del soft delete.
  // isActive se deriva de status en el modelo, y update() solo actúa sobre rutas
  // no eliminadas, así que una ruta eliminada no se puede activar (404).
  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive) {
    const current = await findCurrent(routeRepository, id, "Route");
    if (current.isActive === isActive) return routeService.getById(id);
    return routeService.update(id, { status: statusFromActive(isActive) });
  },

  // Sus imágenes se eliminan con ella, con el mismo deletedAt
  async remove(id) {
    await findCurrent(routeRepository, id, "Route");
    await softDeleteWithCascades({
      repository: routeRepository,
      id,
      resource: "Route",
      dependents: [
        { repository: experienceRepository, filter: { routeId: id }, message: "Cannot delete a route that has experiences" },
      ],
      cascades: [imageService.cascade("route", id)],
    });
  },

  // Solo se restauran rutas eliminadas. Vuelven con el estado que tenían, salvo que
  // se pida otro con isActive; deletedAt y status cambian en la misma operación.
  async restore(id, isActive) {
    const deleted = await findRestorable(routeRepository, id, "Route");

    // Sus referencias tienen que seguir existiendo (aunque estén inactivas)
    for (const { field, repository, resource } of REFERENCES) {
      await assertRestorable(repository, deleted[field], field, resource);
    }

    await routeRepository.restoreById(id, restoredStatus(isActive));
    await imageService.restoreByOwner("route", id, deleted.deletedAt);
    // Si una referencia se ha eliminado entretanto, vuelve a la papelera con lo suyo
    await confirmReferences(referencesOf(deleted), async () => {
      await imageService.removeByOwner("route", id, deleted.deletedAt);
      await routeRepository.softDeleteById(id, deleted.deletedAt);
    });
    return routeService.getById(id);
  },
};
