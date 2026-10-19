import { conflict, fieldError, notFound } from "../utils/errors.js";

// MongoDB no vigila las relaciones: estas comprobaciones las hacen los services.

/**
 * Comprueba que una referencia apunta a un documento que existe, no está eliminado
 * y (si se pide) está activo. Si no, lanza un 400 en ese campo. Devuelve el documento.
 *
 * @param repository repositorio de la colección referenciada (con findById)
 * @param resource nombre del recurso en los mensajes: "role", "location"...
 */
export async function assertReference(repository, id, field, resource, { mustBeActive = true } = {}) {
  const document = await repository.findById(id);

  if (!document || (mustBeActive && !document.isActive)) {
    const state = mustBeActive ? "an active" : "an existing";
    throw fieldError(field, `${field} must reference ${state} ${resource}`);
  }

  return document;
}

/** 409 si quedan documentos no eliminados que dependen del que se quiere eliminar. */
export async function assertNoDependents(repository, filter, message) {
  if (await repository.exists(filter)) throw conflict(message);
}

/** 409 al restaurar si una referencia apunta a un documento eliminado. */
export async function assertRestorable(repository, id, field, resource) {
  if (!(await repository.findById(id))) {
    throw conflict(`Cannot restore: ${field} references a deleted ${resource}`);
  }
}

/**
 * Devuelve el documento eliminado que se quiere restaurar. Si no está eliminado, 409;
 * si no existe, 404.
 *
 * @param resource nombre del recurso en los mensajes: "Route", "Experience"...
 */
export async function findRestorable(repository, id, resource) {
  const deleted = await repository.findDeletedById(id);
  if (deleted) return deleted;

  if (await repository.findById(id)) throw conflict(`${resource} is not deleted`);
  throw notFound(resource);
}

/** 409 si el slug que tendría un documento nuevo ya existe (también en la papelera). */
export async function assertSlugAvailable(repository, slug, resource) {
  if (await repository.existsBySlug(slug)) {
    const article = /^[AEIOU]/.test(resource) ? "An" : "A";
    throw conflict(`${article} ${resource.toLowerCase()} with this slug already exists`);
  }
}
