import { ROLES } from "../models/role.model.js";

/*
 * ABAC: quién puede tocar un recurso según sus atributos (de quién es). Son funciones
 * puras, sin Express ni base de datos: reciben el usuario de la sesión (req.user:
 * { id, email, role, name }) y el recurso ya cargado, con su cadena de dueños:
 *
 *   host.userId → experience.host → departure.experience
 *
 * Los services cargan esa cadena y, si la función devuelve false, lanzan forbidden().
 * El admin puede con todo.
 */

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

export const isAdminUser = (user) => user?.role === ROLES.ADMIN;

/** El admin, o el dueño de un recurso que guarda su usuario en userId (Host, Profile...). */
export function isOwnerOrAdmin(user, resource) {
  return isAdminUser(user) || sameId(user?.id, resource?.userId);
}

/** El admin, o el propio usuario: para su cuenta y su perfil (resource es un User). */
export function canAccessUserResource(user, resource) {
  return isAdminUser(user) || sameId(user?.id, resource?._id);
}

/** Un perfil de anfitrión: solo el usuario al que pertenece. */
export function canModifyHost(user, host) {
  return isOwnerOrAdmin(user, host);
}

/** Una experiencia: la de un anfitrión del usuario. experience.host tiene que venir cargado. */
export function canModifyExperience(user, experience) {
  return isAdminUser(user) || canModifyHost(user, experience?.host);
}

/** Una salida: la de una experiencia del usuario. departure.experience.host, cargados. */
export function canModifyDeparture(user, departure) {
  return isAdminUser(user) || canModifyExperience(user, departure?.experience);
}

/**
 * Las imágenes son de su dueño (ownerType + ownerId). Fuera del admin, cada usuario
 * gestiona su propia foto (ownerType user) y un anfitrión, además, las de su perfil de
 * anfitrión y sus experiencias. Las de rutas, categorías y ubicaciones, solo el admin.
 */
export function canModifyImageOwner(user, ownerType, owner) {
  if (isAdminUser(user)) return true;
  if (ownerType === "user") return canAccessUserResource(user, owner);
  if (ownerType === "host") return canModifyHost(user, owner);
  if (ownerType === "experience") return canModifyExperience(user, owner);
  return false;
}

/**
 * El actor de los procesos internos (el seed): actúa como admin. Los services nunca lo
 * suponen: si no reciben actor, las comprobaciones fallan (403), no se saltan.
 */
export const SYSTEM_ACTOR = Object.freeze({ id: null, email: null, role: ROLES.ADMIN, name: "system" });
