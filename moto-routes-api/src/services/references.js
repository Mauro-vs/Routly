import { badRequest, conflict, fieldError, notFound } from "../utils/errors.js";

// Comprobaciones que comparten todos los services. MongoDB no vigila las relaciones
// ni el estado de los documentos: lo hacen estas funciones antes de cada escritura.

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

/**
 * 400 si el id no tiene formato de ObjectId. Zod ya lo comprueba en las rutas; esto
 * protege cuando un service se llama desde otro sitio (el seed u otro service).
 */
export function assertObjectId(id, field = "id") {
  if (!OBJECT_ID.test(String(id))) throw fieldError(field, `${field} has an invalid format`);
}

/**
 * Busca el documento que se va a leer o modificar: tiene que existir, no estar
 * eliminado y ser exactamente el que se pidió. Si no, 404.
 *
 * @param resource nombre del recurso en los mensajes: "Route", "Experience"...
 */
export async function findExisting(repository, id, resource) {
  assertObjectId(id);
  const document = await repository.findById(id);
  if (!document || String(document._id) !== String(id)) throw notFound(resource);
  return document;
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
 * @param repository repositorio de la colección referenciada (con findById)
 * @param resource nombre del recurso en los mensajes: "role", "location"...
 */
export async function assertReference(repository, id, field, resource, { mustBeActive = true } = {}) {
  assertObjectId(id, field);
  const document = await repository.findById(id);

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
  assertObjectId(id);
  const deleted = await repository.findDeletedById(id);
  if (deleted) return deleted;

  if (await repository.findById(id)) throw conflict(`${resource} is not deleted`);
  throw notFound(resource);
}
