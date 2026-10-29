import { BIKE_LIMITS, licenseFor } from "../models/bike.model.js";
import { restoredStatus, statusFromActive } from "../models/status.js";
import { bikeRepository } from "../repositories/bike.repository.js";
import { imageRepository } from "../repositories/image.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { canModifyBike, isAdminUser } from "../utils/access.js";
import { conflict, forbidden, notFound } from "../utils/errors.js";
import { imageService } from "./image.service.js";
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
import { ALL, assertVisible, scopeFilter, scopeOf } from "./visibility.js";

const userReference = (id) => ({ repository: userRepository, id, field: "userId", resource: "user" });

const tooManyBikes = () => conflict(`A user can have at most ${BIKE_LIMITS.perUser} bikes`);

// ABAC: el dueño o el admin
function assertOwnBike(actor, bike) {
  if (!canModifyBike(actor, bike)) throw forbidden();
}

// Para leer una moto suelta: el dueño la ve aunque sea privada o esté inactiva. Sin viewer
// (llamadas internas de este service) se ve todo; con viewer null, es un anónimo.
function scopeFor(viewer, bike) {
  if (viewer === undefined) return ALL;
  if (viewer && viewer.id === String(bike.userId)) return ALL;
  return scopeOf(viewer);
}

// La ficha manda: el carnet se recalcula con la potencia y la cilindrada que quedan (un null
// las vacía, y entonces el carnet también)
function withLicense(data, current) {
  if (data.cc === undefined && data.hp === undefined) return data;
  const cc = data.cc === undefined ? current.cc : data.cc;
  const hp = data.hp === undefined ? current.hp : data.hp;
  return { ...data, license: licenseFor({ cc, hp }) };
}

/*
 * El garaje: las motos de cada usuario (rider, host o admin). Cada una es de su dueño, que la
 * gestiona él (o el admin). Se eliminan y se restauran en cascada con su usuario
 * (cascadeForUser), y sus fotos son imágenes con ownerType "bike".
 */
export const bikeService = {
  // scope (services/visibility.js): en PUBLIC, solo las públicas y activas de usuarios activos
  async list(scope) {
    return imageService.attachCovers("bike", await bikeRepository.findAll(await scopeFilter("bike", scope)));
  },

  async listByActive(isActive, scope) {
    const filter = { isActive, ...(await scopeFilter("bike", scope)) };
    return imageService.attachCovers("bike", await bikeRepository.findAll(filter));
  },

  async listDeleted() {
    return bikeRepository.findDeleted();
  },

  // Mi garaje: todas las mías, también las privadas y las inactivas
  async listMine(actor) {
    return imageService.attachCovers("bike", await bikeRepository.findAll({ userId: actor.id }));
  },

  async getById(id, viewer) {
    const bike = await findExisting(bikeRepository, id, "Bike");
    await assertVisible(bikeRepository, "bike", bike, scopeFor(viewer, bike), "Bike");
    return imageService.attachCover("bike", bike);
  },

  async getBySlug(slug, viewer) {
    const bike = await bikeRepository.findBySlug(slug);
    if (!bike) throw notFound("Bike");
    await assertVisible(bikeRepository, "bike", bike, scopeFor(viewer, bike), "Bike");
    return imageService.attachCover("bike", bike);
  },

  // La moto es de quien la crea. Solo el admin la da de alta para otro usuario (userId).
  // La primera del garaje es la principal.
  async create({ userId, ...data }, actor) {
    const ownerId = userId ?? actor?.id;
    if (!ownerId || (String(ownerId) !== actor?.id && !isAdminUser(actor))) throw forbidden();

    await assertReference(userRepository, ownerId, "userId", "user");
    const count = await bikeRepository.countByUser(ownerId);
    if (count >= BIKE_LIMITS.perUser) throw tooManyBikes();

    const isPrimary = data.isPrimary === true || count === 0;
    if (isPrimary) await bikeRepository.unsetPrimary(ownerId);

    const license = licenseFor(data);
    const { _id } = await bikeRepository.create({
      ...data,
      userId: ownerId,
      isPrimary,
      ...(license && { license }),
    });
    // Sin transacciones: el usuario tiene que seguir vivo después de escribir
    await confirmReferences([userReference(ownerId)], () => bikeRepository.deleteCreatedById(_id));
    return bikeService.getById(_id);
  },

  // userId no llega: el dueño de una moto no cambia. modifications sustituye a la lista anterior
  async update(id, data, actor) {
    assertHasChanges(data);

    const bike = await findCurrent(bikeRepository, id, "Bike");
    assertOwnBike(actor, bike);

    let changes = withLicense(data, bike);
    // El slug sale de la marca y el modelo: si cambia uno, se manda también el otro
    if (data.brand !== undefined || data.model !== undefined) {
      changes = { brand: bike.brand, model: bike.model, ...changes };
    }
    if (data.isPrimary === true && !bike.isPrimary) await bikeRepository.unsetPrimary(bike.userId);

    ensureWritten(await bikeRepository.updateById(id, changes), "Bike");
    return bikeService.getById(id);
  },

  // Si ya tiene ese estado, se devuelve tal cual: no se escribe ni cambia updatedAt
  async setActive(id, isActive, actor) {
    const current = await findCurrent(bikeRepository, id, "Bike");
    assertOwnBike(actor, current);
    if (current.isActive === isActive) return bikeService.getById(id);
    return bikeService.update(id, { status: statusFromActive(isActive) }, actor);
  },

  // Sus fotos van con ella. Si era la principal, lo pasa a ser la siguiente del garaje
  async remove(id, actor) {
    const bike = await findCurrent(bikeRepository, id, "Bike");
    assertOwnBike(actor, bike);

    await softDeleteWithCascades({
      repository: bikeRepository,
      id,
      resource: "Bike",
      cascades: [imageService.cascade("bike", id)],
    });

    if (bike.isPrimary) {
      await bikeRepository.clearPrimary(id);
      const next = await bikeRepository.findFirstActiveByUser(bike.userId, id);
      if (next) await bikeRepository.updateById(next._id, { isPrimary: true });
    }
  },

  // Vuelve sin ser la principal, salvo que el garaje se haya quedado sin ninguna
  async restore(id, isActive, actor) {
    const deleted = await findRestorable(bikeRepository, id, "Bike");
    assertOwnBike(actor, deleted);
    await assertRestorable(userRepository, deleted.userId, "userId", "user");
    if ((await bikeRepository.countByUser(deleted.userId)) >= BIKE_LIMITS.perUser) throw tooManyBikes();

    await bikeRepository.restoreById(id, { ...restoredStatus(isActive), isPrimary: false });
    await imageService.restoreByOwner("bike", id, deleted.deletedAt);
    await confirmReferences([userReference(deleted.userId)], async () => {
      await imageService.removeByOwner("bike", id, deleted.deletedAt);
      await bikeRepository.softDeleteById(id, deleted.deletedAt);
    });

    if (!(await bikeRepository.exists({ userId: deleted.userId, isPrimary: true }))) {
      await bikeRepository.updateById(id, { isPrimary: true });
    }
    return bikeService.getById(id);
  },

  // ---- Para userService ----

  // El garaje entero se elimina y se restaura con su usuario, fotos incluidas (mismo deletedAt).
  // Es la pieza que recibe softDeleteWithCascades.
  cascadeForUser(userId) {
    return {
      async remove(deletedAt) {
        const ids = await bikeRepository.findIds({ userId });
        await imageRepository.softDeleteByOwners("bike", ids, deletedAt);
        await bikeRepository.softDeleteByUser(userId, deletedAt);
      },
      async restore(deletedAt) {
        await bikeRepository.restoreByUser(userId, deletedAt);
        const ids = await bikeRepository.findIds({ userId });
        await imageRepository.restoreByOwners("bike", ids, deletedAt);
      },
    };
  },
};
