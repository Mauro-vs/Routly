import { categoryRepository } from "../repositories/category.repository.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { hostRepository } from "../repositories/host.repository.js";
import { locationRepository } from "../repositories/location.repository.js";
import { SHOP_DEFAULT_SORT, SHOP_LIMIT } from "../schemas/shop.schema.js";
import { notFound } from "../utils/errors.js";
import { departureService } from "./departure.service.js";
import { experienceService } from "./experience.service.js";
import { imageService } from "./image.service.js";
import { PUBLIC, assertVisible } from "./visibility.js";

/*
 * La tienda pública (/api/shop): el Home, el Shop y el detalle de una experiencia. No tiene
 * consultas propias: traduce sus parámetros a los de los services de cada colección y siempre lee
 * en el alcance público (services/visibility.js), también con sesión de admin, porque es la
 * tienda y no el panel.
 */

// El id de un slug: undefined si no se ha pedido, null si no existe (el Shop sale vacío)
async function idOf(repository, slug) {
  if (slug === undefined) return undefined;
  const document = await repository.findBySlug(slug);
  return document ? String(document._id) : null;
}

const pagination = (total, page, limit) => ({ total, page, limit, totalPages: Math.ceil(total / limit) });

/** Una experiencia visible por su slug, o 404 (como si no existiera). */
async function findVisibleExperience(slug) {
  const experience = await experienceRepository.findPlainBySlug(slug);
  if (!experience) throw notFound("Experience");
  await assertVisible(experienceRepository, "experience", experience, PUBLIC, "Experience");
  return experience;
}

export const shopService = {
  /**
   * Un carrusel del Home: las categorías, los anfitriones o las ubicaciones que tienen alguna
   * experiencia visible, con cuántas (experienceCount) y su foto, de más a menos.
   *
   * @param kind "categories", "hosts" o "locations"
   */
  async carousel(kind, { limit } = {}) {
    return (await experienceService.facets({ limit, kinds: [kind] }, PUBLIC))[kind];
  },

  /**
   * El Shop: una página de experiencias con los filtros por slug, la búsqueda y los filtros de las
   * experiencias (dificultad, idioma, precio y fechas de sus salidas). Un slug que no existe deja
   * el Shop vacío.
   *
   * La búsqueda usa el índice de texto de las experiencias (título y descripción, en español):
   * palabras enteras, sin distinguir mayúsculas ni acentos ("montana" encuentra "Montaña") y con
   * sus variantes ("rutas" encuentra "ruta"). Sin sort, las que mejor encajan primero.
   */
  async experiences(query = {}) {
    const { category, host, location, search, page = 1, limit = SHOP_LIMIT.default, sort, ...filters } = query;

    const [categoryId, hostId, locationId] = await Promise.all([
      idOf(categoryRepository, category),
      idOf(hostRepository, host),
      idOf(locationRepository, location),
    ]);
    if ([categoryId, hostId, locationId].includes(null)) return { data: [], pagination: pagination(0, page, limit) };

    const text = search?.trim();
    const { items, total } = await experienceService.search(
      {
        ...filters,
        ...(categoryId && { categoryId }),
        ...(hostId && { hostId }),
        ...(locationId && { locationId }),
        ...(text && { q: text }),
        // Buscando, sin sort, por relevancia; sin buscar, las más recientes
        ...((sort || !text) && { sort: sort ?? SHOP_DEFAULT_SORT }),
        page,
        limit,
      },
      PUBLIC,
      { byRelevance: true },
    );
    return { data: items, pagination: pagination(total, page, limit) };
  },

  /** El detalle: lo de la experiencia (ruta, anfitrión, moto del guía, precio desde...) y su galería. */
  async experience(slug) {
    const experience = await experienceService.getBySlug(slug, PUBLIC);
    const { items: images } = await imageService.search(
      { ownerType: "experience", ownerId: String(experience._id), sort: "position" },
      PUBLIC,
    );
    return { ...experience, images };
  },

  /** Las salidas que se pueden reservar: activas, programadas y futuras, de la más próxima a la más lejana. */
  async departures(slug) {
    const experience = await findVisibleExperience(slug);
    const { items } = await departureService.search(
      { experienceId: String(experience._id), state: "scheduled", from: new Date(), sort: "startAt" },
      PUBLIC,
    );
    return items;
  },
};
