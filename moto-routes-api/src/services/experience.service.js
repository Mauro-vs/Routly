import { restoredStatus, statusFromActive } from "../models/status.js";
import { departureRepository, reservable } from "../repositories/departure.repository.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { hostRepository } from "../repositories/host.repository.js";
import { bikeRepository } from "../repositories/bike.repository.js";
import { routeRepository } from "../repositories/route.repository.js";
import { canModifyExperience, canModifyHost, isAdminUser } from "../utils/access.js";
import { conflict, fieldError, forbidden, notFound } from "../utils/errors.js";
import { FACETS_LIMIT, experienceListQuery } from "../schemas/experience.schema.js";
import { findList } from "../utils/listQuery.js";
import { bikeService } from "./bike.service.js";
import { categoryService } from "./category.service.js";
import { departureService } from "./departure.service.js";
import { hostService } from "./host.service.js";
import { imageService } from "./image.service.js";
import { locationService } from "./location.service.js";
import { assertVisible, scopeFilter } from "./visibility.js";
import {
  assertHasChanges,
  assertReference,
  assertRestorable,
  confirmReferences,
  ensureWritten,
  findCurrent,
  findExisting,
  findRestorable,
  softDeleteWithCascades,
} from "./references.js";

// Los filtros de experiencias que miran otra colección (schemas/experience.schema.js): una
// consulta por colección, con todas sus condiciones juntas, y el resultado como un $in
const LIST_RESOLVERS = {
  // Por la categoría, la ubicación o la dificultad de su ruta
  async route(clauses) {
    return { routeId: { $in: await routeRepository.findIds({ $and: clauses }) } };
  },
  // Por sus salidas reservables: activas, programadas y futuras, y que cumplen el resto
  async departure(clauses) {
    return { _id: { $in: await departureRepository.findExperienceIds({ $and: [reservable(), ...clauses] }) } };
  },
};

const REFERENCES = [
  { field: "hostId", repository: hostRepository, resource: "host" },
  { field: "routeId", repository: routeRepository, resource: "route" },
];

// Al crear se comprueban todas; al editar, solo las que cambian
async function assertReferences(data, current = {}) {
  for (const { field, repository, resource } of REFERENCES) {
    if (data[field] !== undefined && data[field] !== String(current[field])) {
      await assertReference(repository, data[field], field, resource);
    }
  }
}

// Las referencias de data como piezas de confirmReferences (solo las que llegan)
const referencesOf = (data) =>
  REFERENCES.filter(({ field }) => data[field] !== undefined).map(({ field, repository, resource }) => ({
    repository,
    id: data[field],
    field,
    resource,
  }));

// guideBike: la moto con la que guía (o null)
const withGuideBikes = (experiences, scope) =>
  bikeService.attachGuideBikes(experiences, (experience) => experience.guideBikeId, scope);

// Los datos que no son de la experiencia sino de sus salidas, y por los que se puede ordenar
const COMPUTED_SORT = new Set(["priceFrom", "nextDepartureAt"]);

// El precio "desde" y la próxima fecha de cada una (de sus salidas reservables), o null si no
// tiene ninguna. Una sola agregación para todas.
async function withDepartureSummary(experiences) {
  if (experiences.length === 0) return experiences;
  const summaries = await departureRepository.summarizeReservable(experiences.map((experience) => experience._id));
  const byId = new Map(summaries.map((summary) => [String(summary._id), summary]));
  return experiences.map((experience) => {
    const summary = byId.get(String(experience._id));
    return { ...experience, priceFrom: summary?.priceFrom ?? null, nextDepartureAt: summary?.nextDepartureAt ?? null };
  });
}

// Lo que se enseña de una experiencia además de lo suyo: la moto del guía, la foto principal, el
// precio "desde" y la próxima fecha
async function present(experiences, scope) {
  const withBikes = await withGuideBikes(experiences, scope);
  return withDepartureSummary(await imageService.attachCovers("experience", withBikes));
}

// El detalle: lo de la tarjeta y, además, su anfitrión entero (foto y biografía), presentado por
// su service (en público, sin el email de su usuario)
async function presentDetail(experience, scope) {
  const [presented] = await present([experience], scope);
  const [host] = await hostService.listByIds([experience.hostId], scope);
  return { ...presented, host: host ?? presented.host };
}

// Por los campos de sort, en su sentido. Un dato que falta (una experiencia sin salidas) va
// siempre al final, se ordene como se ordene; si todo empata, el _id
const compareBy = (sort) => (a, b) => {
  for (const [field, direction] of Object.entries(sort)) {
    const [x, y] = [a[field], b[field]];
    if (x == null || y == null) {
      if (x == null && y == null) continue;
      return x == null ? 1 : -1;
    }
    const difference = typeof x === "string" ? x.localeCompare(y, "es") : x - y;
    if (difference !== 0) return difference * direction;
  }
  return String(a._id).localeCompare(String(b._id));
};

// Ordenar por un dato calculado: se ordenan los campos de orden de todas las que cumplen el filtro
// y solo después se traen las de la página, en ese orden
async function findByComputedSort({ filter, sort, page, limit }) {
  const rows = (await withDepartureSummary(await experienceRepository.findSortKeys(filter))).sort(compareBy(sort));
  const slice = page === undefined ? rows : rows.slice((page - 1) * limit, page * limit);
  const position = new Map(slice.map((row, index) => [String(row._id), index]));
  const items = slice.length === 0 ? [] : await experienceRepository.findAll({ _id: { $in: slice.map((row) => row._id) } });
  items.sort((a, b) => position.get(String(a._id)) - position.get(String(b._id)));
  return page === undefined ? { items } : { items, total: rows.length, page, limit };
}

// ABAC: el admin, con todas; un anfitrión, solo con las de su perfil de anfitrión
async function assertOwnHost(actor, hostId) {
  if (isAdminUser(actor)) return;
  if (!canModifyHost(actor, await hostRepository.findPlainById(hostId))) throw forbidden();
}

async function assertOwnExperience(actor, experience) {
  if (isAdminUser(actor)) return;
  const host = await hostRepository.findPlainById(experience.hostId);
  if (!canModifyExperience(actor, { ...experience, host })) throw forbidden();
}

export const experienceService = {
  // scope (services/visibility.js): en PUBLIC, sin las de un anfitrión o una ruta ocultos
  // Listado con query params (utils/listQuery.js): filtros, búsqueda, orden y página.
  // extra: una condición más que no es un query param (la búsqueda en el título de la tienda)
  async search(query = {}, scope, extra = {}) {
    const base = { ...(await scopeFilter("experience", scope)), ...extra };
    const listQuery = await experienceListQuery.build(query, base, LIST_RESOLVERS);
    const byComputed = listQuery.sort && Object.keys(listQuery.sort).some((field) => COMPUTED_SORT.has(field));
    const page = byComputed ? await findByComputedSort(listQuery) : await findList(experienceRepository, listQuery);
    return { ...page, items: await present(page.items, scope) };
  },

  // /actives e /inactives: lo mismo que ?status=
  async listByActive(isActive, scope) {
    return (await experienceService.search({ status: isActive ? "active" : "inactive" }, scope)).items;
  },

  /**
   * Los carruseles del Home: las categorías, los anfitriones y las ubicaciones que tienen alguna
   * experiencia visible, cada uno con cuántas (experienceCount), de más a menos y por nombre si
   * empatan. La categoría y las ubicaciones de una experiencia son las de su ruta: una ruta que
   * empieza y acaba en el mismo sitio cuenta una vez. Se cuenta en memoria con dos consultas
   * ligeras (las experiencias y sus rutas), y cada lista la presenta su service (con su foto).
   */
  async facets({ limit = FACETS_LIMIT.default, kinds = ["categories", "hosts", "locations"] } = {}, scope) {
    const experiences = await experienceRepository.findFacetKeys(await scopeFilter("experience", scope));
    const routes = await routeRepository.findReferences([...new Set(experiences.map((e) => String(e.routeId)))]);
    const routeById = new Map(routes.map((route) => [String(route._id), route]));

    const counts = { categories: new Map(), hosts: new Map(), locations: new Map() };
    const add = (map, id) => map.set(String(id), (map.get(String(id)) ?? 0) + 1);
    for (const experience of experiences) {
      add(counts.hosts, experience.hostId);
      const route = routeById.get(String(experience.routeId));
      if (!route) continue;
      add(counts.categories, route.categoryId);
      for (const id of new Set([String(route.startLocationId), String(route.endLocationId)])) add(counts.locations, id);
    }

    // Solo se presentan las listas pedidas (la tienda pide una por carrusel)
    const wanted = (kind, list) => (kinds.includes(kind) ? list() : []);
    const [categories, hosts, locations] = await Promise.all([
      wanted("categories", () => categoryService.listByIds([...counts.categories.keys()])),
      wanted("hosts", () => hostService.listByIds([...counts.hosts.keys()], scope)),
      wanted("locations", () => locationService.listByIds([...counts.locations.keys()])),
    ]);
    const rank = (items, map, label) =>
      items
        .map((item) => ({ ...item, experienceCount: map.get(String(item._id)) ?? 0 }))
        .sort((a, b) => b.experienceCount - a.experienceCount || label(a).localeCompare(label(b), "es"))
        .slice(0, limit);

    const lists = {
      categories: rank(categories, counts.categories, (category) => category.name),
      hosts: rank(hosts, counts.hosts, (host) => host.name),
      locations: rank(locations, counts.locations, (location) => location.city),
    };
    return Object.fromEntries(kinds.map((kind) => [kind, lists[kind]]));
  },

  async listDeleted() {
    return withGuideBikes(await experienceRepository.findDeleted());
  },

  async getById(id, scope) {
    const experience = await findExisting(experienceRepository, id, "Experience");
    await assertVisible(experienceRepository, "experience", experience, scope, "Experience");
    return presentDetail(experience, scope);
  },

  async getBySlug(slug, scope) {
    const experience = await experienceRepository.findBySlug(slug);
    if (!experience) throw notFound("Experience");
    await assertVisible(experienceRepository, "experience", experience, scope, "Experience");
    return presentDetail(experience, scope);
  },

  async create(data, actor) {
    await assertReferences(data);
    await assertOwnHost(actor, data.hostId);
    if (data.guideBikeId) await bikeService.assertGuideBike(data.guideBikeId, data.hostId);

    const { _id } = await experienceRepository.create(data);
    // Sin transacciones: las referencias tienen que seguir vivas después de escribir
    const references = [...referencesOf(data), ...(data.guideBikeId ? [bikeService.guideReference(data.guideBikeId)] : [])];
    await confirmReferences(references, () => experienceRepository.deleteCreatedById(_id));
    return experienceService.getById(_id);
  },

  async update(id, data, actor) {
    assertHasChanges(data);

    const experience = await findCurrent(experienceRepository, id, "Experience");
    await assertOwnExperience(actor, experience);
    await assertReferences(data, experience);
    // Un anfitrión no puede pasar su experiencia a otro anfitrión
    if (data.hostId !== undefined) await assertOwnHost(actor, data.hostId);

    // La moto del guía tiene que ser del anfitrión que quede, también si cambia el anfitrión
    const guideBikeId = data.guideBikeId === undefined ? experience.guideBikeId : data.guideBikeId;
    if ((data.hostId !== undefined || data.guideBikeId) && guideBikeId) {
      await bikeService.assertGuideBike(guideBikeId, data.hostId ?? experience.hostId);
    }

    // Si solo llega uno de los dos límites, se compara con el guardado
    const minParticipants = data.minParticipants ?? experience.minParticipants;
    const maxParticipants = data.maxParticipants ?? experience.maxParticipants;
    if (maxParticipants < minParticipants) {
      throw fieldError(
        "maxParticipants",
        "maxParticipants must be greater than or equal to minParticipants"
      );
    }

    // No se puede dejar una salida con más plazas que el nuevo máximo
    if (
      data.maxParticipants !== undefined &&
      (await departureRepository.exists({ experienceId: id, capacity: { $gt: data.maxParticipants } }))
    ) {
      throw conflict("maxParticipants is lower than the capacity of an existing departure");
    }

    // Ni con menos plazas que el nuevo mínimo
    const belowMinimum = { experienceId: id, capacity: { $lt: data.minParticipants } };
    if (data.minParticipants !== undefined && (await departureRepository.exists(belowMinimum))) {
      throw conflict("minParticipants is higher than the capacity of an existing departure");
    }

    ensureWritten(await experienceRepository.updateById(id, data), "Experience");
    // Las que cambian tienen que seguir vivas; si no, vuelven a las de antes
    const changed = referencesOf(data).filter(({ field }) => data[field] !== String(experience[field]));
    await confirmReferences(changed, () =>
      experienceRepository.updateById(id, Object.fromEntries(changed.map(({ field }) => [field, experience[field]])))
    );
    if (data.guideBikeId) {
      await confirmReferences([bikeService.guideReference(data.guideBikeId)], () =>
        experienceRepository.updateById(id, { guideBikeId: experience.guideBikeId ?? null })
      );
    }
    if (data.title !== undefined && data.title !== experience.title) {
      await departureService.renameExperience(id, data.title);
    }
    return experienceService.getById(id);
  },

  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive, actor) {
    const current = await findCurrent(experienceRepository, id, "Experience");
    await assertOwnExperience(actor, current);
    if (current.isActive === isActive) return experienceService.getById(id);
    return experienceService.update(id, { status: statusFromActive(isActive) }, actor);
  },

  async remove(id, actor) {
    await assertOwnExperience(actor, await findCurrent(experienceRepository, id, "Experience"));
    await softDeleteWithCascades({
      repository: experienceRepository,
      id,
      resource: "Experience",
      dependents: [
        {
          repository: departureRepository,
          filter: { experienceId: id },
          message: "Cannot delete an experience that has departures",
        },
      ],
      cascades: [imageService.cascade("experience", id)],
    });
  },

  async restore(id, isActive, actor) {
    const deleted = await findRestorable(experienceRepository, id, "Experience");
    await assertOwnExperience(actor, deleted);

    for (const { field, repository, resource } of REFERENCES) {
      await assertRestorable(repository, deleted[field], field, resource);
    }
    if (deleted.guideBikeId && !(await bikeRepository.findPlainById(deleted.guideBikeId))) {
      throw conflict("Cannot restore: guideBikeId references a deleted bike");
    }

    await experienceRepository.restoreById(id, restoredStatus(isActive));
    await imageService.restoreByOwner("experience", id, deleted.deletedAt);
    // Si una referencia se ha eliminado entretanto, vuelve a la papelera con lo suyo
    await confirmReferences(referencesOf(deleted), async () => {
      await imageService.removeByOwner("experience", id, deleted.deletedAt);
      await experienceRepository.softDeleteById(id, deleted.deletedAt);
    });
    return experienceService.getById(id);
  },
};
