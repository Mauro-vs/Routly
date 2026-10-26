import { restoredStatus, statusFromActive } from "../models/status.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { routeRepository } from "../repositories/route.repository.js";
import { notFound } from "../utils/errors.js";
import { imageService } from "./image.service.js";
import {
  assertHasChanges,
  assertNotTaken,
  assertNoDependents,
  ensureWritten,
  findCurrent,
  findExisting,
  findRestorable,
} from "./references.js";

export const categoryService = {
  async list() {
    return categoryRepository.findAll();
  },

  async listByActive(isActive) {
    return categoryRepository.findAll({ isActive });
  },

  async listDeleted() {
    return categoryRepository.findDeleted();
  },

  async getById(id) {
    return findExisting(categoryRepository, id, "Category");
  },

  async getBySlug(slug) {
    const category = await categoryRepository.findBySlug(slug);
    if (!category) throw notFound("Category");
    return category;
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
    await assertNoDependents(
      routeRepository,
      { categoryId: id },
      "Cannot delete a category that has routes"
    );

    const category = ensureWritten(await categoryRepository.softDeleteById(id), "Category");
    await imageService.removeByOwner("category", id, category.deletedAt);
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
