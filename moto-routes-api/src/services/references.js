import { badRequest, conflict, fieldError, notFound } from "../utils/errors.js";
import { OBJECT_ID_PATTERN } from "../utils/objectId.js";

// Comprobaciones que comparten todos los services. MongoDB no vigila las relaciones
// ni el estado de los documentos: lo hacen estas funciones antes de cada escritura.

/**
 * 400 si el id no tiene formato de ObjectId. Zod ya lo comprueba en las rutas; esto
 * protege cuando un service se llama desde otro sitio (el seed u otro service).
 */
function assertObjectId(id, field = "id") {
  if (!OBJECT_ID_PATTERN.test(String(id))) {
    throw fieldError(field, `${field} has an invalid format`);
  }
}

/**
 * Busca el documento que se va a leer: tiene que existir y no estar eliminado. Si no,
 * 404. Trae sus relaciones (populate), como lo devuelve un GET.
 *
 * @param resource nombre del recurso en los mensajes: "Route", "Experience"...
 */
export async function findExisting(repository, id, resource) {
  assertObjectId(id);
  const document = await repository.findById(id);
  if (!document) throw notFound(resource);
  return document;
}

/**
 * Igual que findExisting, pero sin relaciones: el documento tal como está guardado.
 * Es lo que necesitan las reglas antes de editar, activar o eliminar, y cuesta una
 * sola consulta. Los repositorios sin relaciones no tienen findPlainById: su findById
 * ya es así.
 */
export async function findCurrent(repository, id, resource) {
  assertObjectId(id);
  const document = await findPlain(repository, id);
  if (!document) throw notFound(resource);
  return document;
}

// El documento sin relaciones, o null si no existe o está eliminado
function findPlain(repository, id) {
  return repository.findPlainById ? repository.findPlainById(id) : repository.findById(id);
}

/**
 * Comprueba el resultado de una escritura. Si es null, el documento se eliminó entre
 * la búsqueda y la escritura: 404, no un 500 ni un 200 vacío.
 */
export function ensureWritten(document, resource) {
  if (!document) throw notFound(resource);
  return document;
}

/** 400 si en un PATCH no llega ningún campo que cambiar (Zod ya ha quitado los desconocidos). */
export function assertHasChanges(data) {
  if (!Object.values(data).some((value) => value !== undefined)) {
    throw badRequest("No fields to update");
  }
}

/**
 * Comprueba que una referencia apunta a un documento que existe, no está eliminado
 * y (si se pide) está activo. Si no, lanza un 400 en ese campo. Devuelve el documento.
 *
 * @param repository repositorio de la colección referenciada
 * @param resource nombre del recurso en los mensajes: "role", "location"...
 */
export async function assertReference(repository, id, field, resource, { mustBeActive = true } = {}) {
  assertObjectId(id, field);
  const document = await findPlain(repository, id);

  if (!document || (mustBeActive && !document.isActive)) {
    const state = mustBeActive ? "an active" : "an existing";
    throw fieldError(field, `${field} must reference ${state} ${resource}`);
  }

  return document;
}

/**
 * 409 si el valor único (nombre, email...) ya lo usa otro documento. Si ese documento
 * está en la papelera se dice, porque lo que toca es restaurarlo y no crear otro.
 *
 * @param existing resultado de findDuplicateBy...: null o { _id, deletedAt }
 */
export function assertNotTaken(existing, message) {
  if (!existing) return;
  throw conflict(existing.deletedAt ? `${message} in the trash` : message);
}

/** 409 si quedan documentos no eliminados que dependen del que se quiere eliminar. */
export async function assertNoDependents(repository, filter, message) {
  if (await repository.exists(filter)) throw conflict(message);
}

/** 409 al restaurar si una referencia apunta a un documento eliminado. */
export async function assertRestorable(repository, id, field, resource) {
  if (!(await findPlain(repository, id))) {
    throw conflict(`Cannot restore: ${field} references a deleted ${resource}`);
  }
}

/*
 * ---------- Sin transacciones: doble comprobación ----------
 *
 * MongoDB en standalone no tiene transacciones, así que entre comprobar una referencia y
 * escribir puede colarse otra petición (crear una ruta mientras se elimina su categoría).
 * Cada lado escribe y después vuelve a comprobar: si el otro ha llegado antes, deshace lo
 * suyo. En el peor caso fallan los dos, pero nunca queda una referencia huérfana.
 */

/**
 * Segunda comprobación después de crear, editar o restaurar: las referencias que se acaban
 * de escribir siguen vivas. Si alguna se ha eliminado entretanto, deshace la escritura con
 * undo() y lanza el mismo 400 que assertReference.
 *
 * @param references [{ repository, id, field, resource }]
 */
export async function confirmReferences(references, undo) {
  for (const { repository, id, field, resource } of references) {
    if (!(await findPlain(repository, id))) {
      await undo();
      throw fieldError(field, `${field} must reference an active ${resource}`);
    }
  }
}

/**
 * Soft delete de un documento con sus cascadas, sin dejar nada a medias:
 *
 * 1. Sin dependientes vivos (409).
 * 2. Primero las cascadas (imágenes, perfil), con el mismo deletedAt que el dueño; después
 *    el dueño. Si algo falla, las cascadas se deshacen: el dueño sigue vivo con todo lo suyo.
 * 3. Segunda comprobación: si se ha creado un dependiente entretanto, se restaura todo (409).
 *
 * @param dependents [{ repository, filter, message }]
 * @param cascades [{ remove(deletedAt), restore(deletedAt) }]
 */
export async function softDeleteWithCascades({ repository, id, resource, dependents = [], cascades = [] }) {
  for (const dependent of dependents) {
    await assertNoDependents(dependent.repository, dependent.filter, dependent.message);
  }

  const deletedAt = new Date();
  const undoCascades = () => Promise.all(cascades.map((cascade) => cascade.restore(deletedAt)));

  let deleted;
  try {
    for (const cascade of cascades) await cascade.remove(deletedAt);
    deleted = await repository.softDeleteById(id, deletedAt);
  } catch (error) {
    await undoCascades();
    throw error;
  }
  // Lo ha eliminado otra petición entretanto
  if (!deleted) {
    await undoCascades();
    throw notFound(resource);
  }

  for (const dependent of dependents) {
    if (await dependent.repository.exists(dependent.filter)) {
      await repository.restoreById(id);
      await undoCascades();
      throw conflict(dependent.message);
    }
  }
  return deleted;
}

/**
 * Devuelve el documento eliminado que se quiere restaurar. Si no está eliminado, 409;
 * si no existe, 404.
 *
 * @param resource nombre del recurso en los mensajes: "Route", "Experience"...
 */
export async function findRestorable(repository, id, resource) {
  assertObjectId(id);
  const deleted = await repository.findDeletedById(id);
  if (deleted) return deleted;

  if (await findPlain(repository, id)) throw conflict(`${resource} is not deleted`);
  throw notFound(resource);
}
