import { statusFromActive } from "../models/status.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { routeRepository } from "../repositories/route.repository.js";
import { conflict, notFound } from "../utils/errors.js";
import { buildSlug } from "../utils/slugify.js";
import { imageService } from "./image.service.js";
import { assertNoDependents, assertSlugAvailable, findRestorable } from "./references.js";

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
    const category = await categoryRepository.findById(id);
    if (!category) throw notFound("Category");
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

    const _id = categoryRepository.generateId();
    await assertSlugAvailable(categoryRepository, buildSlug(data.name, _id), "Category");

    await categoryRepository.create({ ...data, _id });
    return categoryService.getById(_id);
  },

  async update(id, data) {
    await categoryService.getById(id);

    if (data.name !== undefined && (await categoryRepository.existsByName(data.name, id))) {
      throw conflict("A category with this name already exists");
    }

    return categoryRepository.updateById(id, data);
  },

  // Desactivar no se propaga: sus rutas siguen igual, pero no se puede usar en rutas nuevas
  async setActive(id, isActive) {
    return categoryService.update(id, { status: statusFromActive(isActive) });
  },

  async remove(id) {
    await categoryService.getById(id);
    await assertNoDependents(
      routeRepository,
      { categoryId: id },
      "Cannot delete a category that has routes"
    );

    const category = await categoryRepository.softDeleteById(id);
    await imageService.removeByOwner("category", id, category.deletedAt);
  },

  async restore(id, isActive = false) {
    const deleted = await findRestorable(categoryRepository, id, "Category");

    const category = await categoryRepository.restoreById(id, { status: statusFromActive(isActive) });
    await imageService.restoreByOwner("category", id, deleted.deletedAt);
    return category;
  },
};
