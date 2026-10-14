import { ROUTE_STATUS } from "../models/route.model.js";
import { routeRepository } from "../repositories/route.repository.js";
import { conflict, notFound } from "../utils/errors.js";
import { buildSlug } from "../utils/slugify.js";

// Los datos llegan ya validados y limpios por los esquemas de Zod
// (src/schemas/route.schema.js), aplicados en las rutas con validate().
export const routeService = {
  async list() {
    return routeRepository.findAll();
  },

  // Las rutas eliminadas nunca aparecen, tampoco entre las inactivas
  async listByActive(isActive) {
    return routeRepository.findAll({ isActive });
  },

  // La papelera: solo rutas eliminadas. Es la única consulta que las devuelve.
  async listDeleted() {
    return routeRepository.findDeleted();
  },

  async getById(id) {
    const route = await routeRepository.findById(id);
    if (!route) throw notFound("Route");
    return route;
  },

  async getBySlug(slug) {
    const route = await routeRepository.findBySlug(slug);
    if (!route) throw notFound("Route");
    return route;
  },

  // Antes de crear se comprueba que el slug no exista ya (tampoco en una ruta
  // eliminada). El slug lleva el sufijo del _id, por eso el _id se genera aquí;
  // el modelo calcula ese mismo slug al guardar. El índice único de la base de
  // datos sigue siendo la garantía final si llegan dos altas a la vez.
  async create(data) {
    const _id = routeRepository.generateId();
    const slug = buildSlug(data.title, _id);

    if (await routeRepository.existsBySlug(slug)) {
      throw conflict("A route with this slug already exists");
    }

    return routeRepository.create({ ...data, _id });
  },

  async update(id, data) {
    const route = await routeRepository.updateById(id, data);
    if (!route) throw notFound("Route");
    return route;
  },

  // Activar o desactivar no toca deletedAt: es independiente del soft delete.
  // isActive se deriva de status en el modelo, y update() solo actúa sobre rutas
  // no eliminadas, así que una ruta eliminada no se puede activar (404).
  async setActive(id, isActive) {
    const status = isActive ? ROUTE_STATUS.ACTIVE : ROUTE_STATUS.INACTIVE;
    return routeService.update(id, { status });
  },

  async remove(id) {
    const route = await routeRepository.softDeleteById(id);
    if (!route) throw notFound("Route");
  },

  // Solo se restauran rutas eliminadas, y vuelven inactivas salvo que se pida
  // isActive: true. deletedAt y status cambian en la misma operación, así que
  // una ruta nunca queda activa mientras sigue eliminada.
  async restore(id, isActive = false) {
    const status = isActive ? ROUTE_STATUS.ACTIVE : ROUTE_STATUS.INACTIVE;
    const route = await routeRepository.restoreById(id, { status });
    if (route) return route;

    // No había nada que restaurar: o la ruta no está eliminada, o no existe
    if (await routeRepository.findById(id)) throw conflict("Route is not deleted");
    throw notFound("Route");
  },
};
