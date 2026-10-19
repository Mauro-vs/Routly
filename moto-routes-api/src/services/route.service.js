import { statusFromActive } from "../models/status.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { locationRepository } from "../repositories/location.repository.js";
import { routeRepository } from "../repositories/route.repository.js";
import { notFound } from "../utils/errors.js";
import { buildSlug } from "../utils/slugify.js";
import { imageService } from "./image.service.js";
import {
  assertNoDependents,
  assertReference,
  assertRestorable,
  assertSlugAvailable,
  findRestorable,
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
    const route = await routeRepository.findById(id);
    if (!route) throw notFound("Route");
    return imageService.attachCover("route", route);
  },

  async getBySlug(slug) {
    const route = await routeRepository.findBySlug(slug);
    if (!route) throw notFound("Route");
    return imageService.attachCover("route", route);
  },

  // Antes de crear se comprueba que el slug no exista ya (tampoco en una ruta
  // eliminada). El slug lleva el sufijo del _id, por eso el _id se genera aquí;
  // el modelo calcula ese mismo slug al guardar. El índice único de la base de
  // datos sigue siendo la garantía final si llegan dos altas a la vez.
  async create(data) {
    await assertReferences(data);

    const _id = routeRepository.generateId();
    await assertSlugAvailable(routeRepository, buildSlug(data.title, _id), "Route");

    await routeRepository.create({ ...data, _id });
    return routeService.getById(_id);
  },

  async update(id, data) {
    const route = await routeService.getById(id);
    await assertReferences(data, route);

    await routeRepository.updateById(id, data);
    return routeService.getById(id);
  },

  // Activar o desactivar no toca deletedAt: es independiente del soft delete.
  // isActive se deriva de status en el modelo, y update() solo actúa sobre rutas
  // no eliminadas, así que una ruta eliminada no se puede activar (404).
  async setActive(id, isActive) {
    return routeService.update(id, { status: statusFromActive(isActive) });
  },

  // Sus imágenes se eliminan con ella, con el mismo deletedAt
  async remove(id) {
    await routeService.getById(id);
    await assertNoDependents(
      experienceRepository,
      { routeId: id },
      "Cannot delete a route that has experiences"
    );

    const route = await routeRepository.softDeleteById(id);
    await imageService.removeByOwner("route", id, route.deletedAt);
  },

  // Solo se restauran rutas eliminadas, y vuelven inactivas salvo que se pida
  // isActive: true. deletedAt y status cambian en la misma operación, así que
  // una ruta nunca queda activa mientras sigue eliminada.
  async restore(id, isActive = false) {
    const deleted = await findRestorable(routeRepository, id, "Route");

    // Sus referencias tienen que seguir existiendo (aunque estén inactivas)
    for (const { field, repository, resource } of REFERENCES) {
      await assertRestorable(repository, deleted[field], field, resource);
    }

    await routeRepository.restoreById(id, { status: statusFromActive(isActive) });
    await imageService.restoreByOwner("route", id, deleted.deletedAt);
    return routeService.getById(id);
  },
};
