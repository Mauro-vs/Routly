import { categoryRepository } from "../repositories/category.repository.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { hostRepository } from "../repositories/host.repository.js";
import { imageRepository } from "../repositories/image.repository.js";
import { locationRepository } from "../repositories/location.repository.js";
import { routeRepository } from "../repositories/route.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { isAdminUser } from "../utils/access.js";
import { notFound } from "../utils/errors.js";

/*
 * Visibilidad pública del catálogo. El admin lo ve todo; el resto (anónimo, rider, host) solo ve
 * lo que está activo y con toda su cadena de padres activa:
 *
 *   categoría, ubicación → inactiva
 *   ruta        → inactiva, o su categoría o alguna de sus ubicaciones está inactiva
 *   anfitrión   → inactivo, o su usuario está inactivo
 *   experiencia → inactiva, o su anfitrión o su ruta están ocultos
 *   salida      → inactiva, o su experiencia está oculta
 *   imagen      → inactiva, o su dueño está oculto (o es un usuario inactivo)
 *
 * No se escribe nada en cascada: es un filtro de lectura. Al reactivar el padre, todo vuelve tal
 * cual. Las escrituras no pasan por aquí (las reglas de cada service siguen igual).
 */

// Alcance de una lectura. Sin alcance (llamadas internas de los services) es ALL.
export const ALL = "all";
export const PUBLIC = "public";

/** El admin lo ve todo; cualquier otro, también sin sesión, solo lo público. */
export const scopeOf = (user) => (isAdminUser(user) ? ALL : PUBLIC);

// ---------- ids de lo que está oculto, de abajo arriba ----------
const inactive = { isActive: false };

const hiddenUsers = () => userRepository.findIds(inactive);
const hiddenCategories = () => categoryRepository.findIds(inactive);
const hiddenLocations = () => locationRepository.findIds(inactive);

async function hiddenRoutes() {
  const [categories, locations] = await Promise.all([hiddenCategories(), hiddenLocations()]);
  return routeRepository.findIds({ $or: [inactive, ...routeParents(categories, locations)] });
}

async function hiddenHosts() {
  return hostRepository.findIds({ $or: [inactive, { userId: { $in: await hiddenUsers() } }] });
}

async function hiddenExperiences() {
  const [hosts, routes] = await Promise.all([hiddenHosts(), hiddenRoutes()]);
  return experienceRepository.findIds({
    $or: [inactive, { hostId: { $in: hosts } }, { routeId: { $in: routes } }],
  });
}

const routeParents = (categories, locations) => [
  { categoryId: { $in: categories } },
  { startLocationId: { $in: locations } },
  { endLocationId: { $in: locations } },
];

// Lo oculto de cada tipo de dueño de una imagen (la clave es su ownerType)
const HIDDEN_OWNERS = {
  route: hiddenRoutes,
  user: hiddenUsers,
  host: hiddenHosts,
  experience: hiddenExperiences,
  category: hiddenCategories,
  location: hiddenLocations,
};

const active = { isActive: true };

// Lo que se ve de cada colección en el alcance público
const PUBLIC_FILTERS = {
  async category() {
    return active;
  },
  async location() {
    return active;
  },
  async route() {
    const [categories, locations] = await Promise.all([hiddenCategories(), hiddenLocations()]);
    return { ...active, $nor: routeParents(categories, locations) };
  },
  async host() {
    return { ...active, userId: { $nin: await hiddenUsers() } };
  },
  async experience() {
    const [hosts, routes] = await Promise.all([hiddenHosts(), hiddenRoutes()]);
    return { ...active, hostId: { $nin: hosts }, routeId: { $nin: routes } };
  },
  async departure() {
    return { ...active, experienceId: { $nin: await hiddenExperiences() } };
  },
  async image() {
    const types = Object.keys(HIDDEN_OWNERS);
    const hidden = await Promise.all(types.map((type) => HIDDEN_OWNERS[type]()));
    return { ...active, $nor: types.map((ownerType, index) => ({ ownerType, ownerId: { $in: hidden[index] } })) };
  },
};

/** El filtro que se suma a un listado: vacío en ALL, el de PUBLIC_FILTERS en PUBLIC. */
export async function scopeFilter(resource, scope) {
  return scope === PUBLIC ? PUBLIC_FILTERS[resource]() : {};
}

/** En el alcance público, si el dueño de una galería está oculto, 404 (como si no existiera). */
export async function assertOwnerVisible(ownerType, ownerId, scope, label) {
  if (scope !== PUBLIC) return;
  const hidden = await HIDDEN_OWNERS[ownerType]();
  if (hidden.some((id) => String(id) === String(ownerId))) throw notFound(label);
}

/**
 * Para leer un documento suelto (por id, slug o SKU): en el alcance público, si cuelga de un
 * padre inactivo, 404, igual que si no existiera.
 *
 * @param label nombre del recurso en el mensaje: "Route", "Experience"...
 */
export async function assertVisible(repository, resource, document, scope, label) {
  if (scope !== PUBLIC) return;
  if (!(await repository.exists({ _id: document._id, ...(await PUBLIC_FILTERS[resource]()) }))) {
    throw notFound(label);
  }
}
