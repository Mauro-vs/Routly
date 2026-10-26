import { statusFromActive } from "../models/status.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { routeRepository } from "../repositories/route.repository.js";
import { conflict, notFound } from "../utils/errors.js";
import { imageService } from "./image.service.js";
import {
  assertHasChanges,
  assertNoDependents,
  ensureWritten,
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
    const category = await findExisting(categoryRepository, id, "Category");
    return category;
  },

  async getBySlug(slug) {
    const category = await categoryRepository.findBySlug(slug);
    if (!category) throw notFound("Category");
    return category;
  },

  // "Montaña" y "MONTAÑA", o "Costa" y "Cósta", cuentan como el mismo nombre
  async create(data) {
    if (await categoryRepository.existsByName(data.name)) {
      throw conflict("A category with this name already exists");
    }

    const { _id } = await categoryRepository.create(data);
    return categoryService.getById(_id);
  },

  async update(id, data) {
    assertHasChanges(data);

    await categoryService.getById(id);

    if (data.name !== undefined && (await categoryRepository.existsByName(data.name, id))) {
      throw conflict("A category with this name already exists");
    }

    return ensureWritten(await categoryRepository.updateById(id, data), "Category");
  },

  // Desactivar no se propaga: sus rutas siguen igual, pero no se puede usar en rutas nuevas
  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive) {
    const current = await categoryService.getById(id);
    if (current.isActive === isActive) return current;
    return categoryService.update(id, { status: statusFromActive(isActive) });
  },

  async remove(id) {
    await categoryService.getById(id);
    await assertNoDependents(
      routeRepository,
      { categoryId: id },
      "Cannot delete a category that has routes"
    );

    const category = ensureWritten(await categoryRepository.softDeleteById(id), "Category");
    await imageService.removeByOwner("category", id, category.deletedAt);
  },

  async restore(id, isActive = false) {
    const deleted = await findRestorable(categoryRepository, id, "Category");

    const category = ensureWritten(
      await categoryRepository.restoreById(id, { status: statusFromActive(isActive) }),
      "Category"
    );
    await imageService.restoreByOwner("category", id, deleted.deletedAt);
    return category;
  },
};
