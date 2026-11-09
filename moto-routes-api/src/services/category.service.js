import { restoredStatus, statusFromActive } from "../models/status.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { routeRepository } from "../repositories/route.repository.js";
import { notFound } from "../utils/errors.js";
import { categoryListQuery } from "../schemas/category.schema.js";
import { findList } from "../utils/listQuery.js";
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
import { assertVisible, scopeFilter } from "./visibility.js";

export const categoryService = {
  // scope (services/visibility.js): en PUBLIC, solo las activas
  // Listado con query params (utils/listQuery.js): filtros, búsqueda, orden y página.
  async search(query = {}, scope) {
    const page = await findList(categoryRepository, await categoryListQuery.build(query, await scopeFilter("category", scope)));
    return { ...page, items: await imageService.attachCovers("category", page.items) };
  },

  // /actives e /inactives: lo mismo que ?status=
  async listByActive(isActive, scope) {
    return (await categoryService.search({ status: isActive ? "active" : "inactive" }, scope)).items;
  },

  async listDeleted() {
    return categoryRepository.findDeleted();
  },

  // Las de unos _id, con su foto: las facetas del Home (experience.service.js)
  async listByIds(ids) {
    return imageService.attachCovers("category", await categoryRepository.findAll({ _id: { $in: ids } }));
  },

  async getById(id, scope) {
    const category = await findExisting(categoryRepository, id, "Category");
    await assertVisible(categoryRepository, "category", category, scope, "Category");
    return imageService.attachCover("category", category);
  },

  async getBySlug(slug, scope) {
    const category = await categoryRepository.findBySlug(slug);
    if (!category) throw notFound("Category");
    await assertVisible(categoryRepository, "category", category, scope, "Category");
    return imageService.attachCover("category", category);
  },

  // "Montaña" y "MONTAÑA", o "Costa" y "Cósta", cuentan como el mismo nombre
  async create(data) {
    assertNotTaken(
      await categoryRepository.findDuplicateByName(data.name),
      "A category with this name already exists"
    );

    const { _id } = await categoryRepository.create(data);
    return categoryService.getById(_id);
  },

  async update(id, data) {
    assertHasChanges(data);

    await findCurrent(categoryRepository, id, "Category");

    if (data.name !== undefined) {
      assertNotTaken(
        await categoryRepository.findDuplicateByName(data.name, id),
        "A category with this name already exists"
      );
    }

    ensureWritten(await categoryRepository.updateById(id, data), "Category");
    return categoryService.getById(id);
  },

  // Desactivar no se propaga: sus rutas siguen igual, pero no se puede usar en rutas nuevas
  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive) {
    const current = await findCurrent(categoryRepository, id, "Category");
    if (current.isActive === isActive) return categoryService.getById(id);
    return categoryService.update(id, { status: statusFromActive(isActive) });
  },

  async remove(id) {
    await findCurrent(categoryRepository, id, "Category");
    await softDeleteWithCascades({
      repository: categoryRepository,
      id,
      resource: "Category",
      dependents: [
        { repository: routeRepository, filter: { categoryId: id }, message: "Cannot delete a category that has routes" },
      ],
      cascades: [imageService.cascade("category", id)],
    });
  },

  async restore(id, isActive) {
    const deleted = await findRestorable(categoryRepository, id, "Category");

    const category = ensureWritten(
      await categoryRepository.restoreById(id, restoredStatus(isActive)),
      "Category"
    );
    await imageService.restoreByOwner("category", id, deleted.deletedAt);
    return category;
  },
};
