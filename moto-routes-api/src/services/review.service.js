import { readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { REVIEW_PHOTOS_PATH, loadUploadsConfig } from "../config/uploads.js";
import { LOW_RATING_MESSAGE, missingLowRatingComment } from "../models/review.model.js";
import { REVIEW_TARGETS } from "../models/reviewTargets.js";
import { restoredStatus, statusFromActive } from "../models/status.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { hostRepository } from "../repositories/host.repository.js";
import { reviewRepository } from "../repositories/review.repository.js";
import { SHOP_REVIEWS_LIMIT, SHOP_REVIEW_SORT, reviewListQuery } from "../schemas/review.schema.js";
import { isAdminUser, isOwnerOrAdmin } from "../utils/access.js";
import { conflict, fieldError, forbidden, notFound, withCode } from "../utils/errors.js";
import { invalidImage, readImageInfo } from "../utils/imageFile.js";
import { findList } from "../utils/listQuery.js";
import { imageService } from "./image.service.js";
import { ratingService, summarize } from "./rating.service.js";
import {
  assertHasChanges,
  confirmReferences,
  ensureWritten,
  findCurrent,
  findExisting,
  findRestorable,
} from "./references.js";
import { PUBLIC, assertVisible } from "./visibility.js";

/*
 * Las opiniones de las experiencias y de los anfitriones (targetType + targetId). Leerlas en la
 * tienda es público; escribir pide sesión; ocultar, restaurar y el listado completo son del admin.
 *
 *   - Una opinión por usuario y objetivo (409 REVIEW_ALREADY_EXISTS).
 *   - Solo su autor la edita. Su autor o el admin la borran. Nadie toca la de otro (403).
 *   - El anfitrión no opina sobre sí mismo ni sobre sus experiencias (403 OWN_TARGET).
 *   - Con 1 o 2 estrellas el comentario es obligatorio (400 COMMENT_REQUIRED_FOR_LOW_RATING).
 *
 * Cada cambio recalcula las notas guardadas (services/rating.service.js).
 *
 * Las fotos (hasta REVIEW_PHOTOS_MAX) se suben de una en una a una opinión que ya existe: solo su
 * autor las sube; su autor o el admin las quitan. El archivo va a disco (config/uploads.js) y en
 * la opinión queda su nombre. Borrar la opinión no borra sus fotos: se puede restaurar.
 */

// Cada tipo de objetivo: su repositorio, su nombre en los mensajes y su regla de visibilidad
const TARGETS = {
  [REVIEW_TARGETS.EXPERIENCE]: { repository: experienceRepository, label: "Experience", visibility: "experience" },
  [REVIEW_TARGETS.HOST]: { repository: hostRepository, label: "Host", visibility: "host" },
};

const alreadyReviewed = () => withCode(conflict("You have already reviewed this"), "REVIEW_ALREADY_EXISTS");
const ownTarget = () =>
  withCode(createForbidden("You cannot review yourself or your own experiences"), "OWN_TARGET");
const lowRatingComment = () => withCode(fieldError("comment", LOW_RATING_MESSAGE), "COMMENT_REQUIRED_FOR_LOW_RATING");

function createForbidden(message) {
  const error = forbidden();
  error.message = message;
  return error;
}

const tooManyPhotos = (max) =>
  withCode(conflict(`A review can have at most ${max} photos`), "TOO_MANY_PHOTOS");

// El índice único (una por usuario y objetivo) cuando dos peticiones llegan a la vez
const isDuplicate = (error) => error?.code === 11000;

/** Un objetivo que se puede valorar: existe, está activo y se ve en la tienda. Si no, 404. */
async function findVisibleTarget(targetType, id) {
  const { repository, label, visibility } = TARGETS[targetType];
  const target = await repository.findPlainById(id);
  if (!target) throw notFound(label);
  await assertVisible(repository, visibility, target, PUBLIC, label);
  return target;
}

/** Lo mismo, por su slug (la tienda). */
async function findVisibleTargetBySlug(targetType, slug) {
  const { repository, label } = TARGETS[targetType];
  const target = repository.findPlainBySlug ? await repository.findPlainBySlug(slug) : await repository.findBySlug(slug);
  if (!target) throw notFound(label);
  return findVisibleTarget(targetType, target._id);
}

/** El usuario del anfitrión de un objetivo: el propio anfitrión, o el de la experiencia. */
async function ownerUserIdOf(targetType, target) {
  if (targetType === REVIEW_TARGETS.HOST) return target.userId;
  const host = await hostRepository.findPlainById(target.hostId);
  return host?.userId;
}

/**
 * Si ese usuario puede opinar sobre ese objetivo, y si no, por qué: { allowed, reason }.
 *
 * Es la única regla de quién puede opinar. Hoy: cualquiera con sesión, menos el anfitrión sobre
 * sí mismo o sus experiencias. Cuando existan las reservas (colección bookings), aquí se exigirá
 * haber hecho la experiencia (reason NOT_A_PARTICIPANT) sin tocar nada más: ni rutas ni la web.
 */
export async function canReview(user, targetType, target) {
  const owner = await ownerUserIdOf(targetType, target);
  if (owner && String(owner) === user.id) return { allowed: false, reason: "OWN_TARGET" };
  return { allowed: true, reason: null };
}

async function assertCanReview(user, targetType, target) {
  const { allowed, reason } = await canReview(user, targetType, target);
  if (!allowed && reason === "OWN_TARGET") throw ownTarget();
  if (!allowed) throw withCode(forbidden(), reason);
}

// ---------- Fotos ----------

/** La opinión, si es de ese usuario. 404 si no existe o está borrada; 403 si es de otro. */
async function findOwnReview(id, actor) {
  const review = await findCurrent(reviewRepository, id, "Review");
  if (String(review.userId) !== actor.id) throw forbidden();
  return review;
}

const photoPath = (file) => path.join(loadUploadsConfig().reviewsDir, file);

// Borrar un archivo que puede no existir ya: si falla, se avisa en el log y se sigue
async function removeFile(filePath) {
  try {
    await rm(filePath, { force: true });
  } catch (error) {
    console.error(`Could not delete ${filePath}:`, error.message);
  }
}

/**
 * Comprueba los bytes del archivo subido y lo deja con la extensión de lo que es de verdad (un PNG
 * que llega como image/jpeg se queda en .png, para que se sirva con su Content-Type).
 * Devuelve { file, path, width, height }. Si no es JPEG, PNG ni WebP, 400 INVALID_IMAGE.
 */
async function checkUploadedPhoto(upload) {
  const info = readImageInfo(await readFile(upload.path));
  if (!info) throw invalidImage();
  const { name } = path.parse(upload.filename);
  const file = `${name}.${info.extension}`;
  const finalPath = photoPath(file);
  if (finalPath !== upload.path) await rename(upload.path, finalPath);
  return { file, path: finalPath, width: info.width, height: info.height };
}

// Lo que ve el cliente de una foto: su URL, nunca la ruta en disco
const photoView = ({ _id, file, width, height, createdAt }) => ({
  _id,
  url: `${REVIEW_PHOTOS_PATH}/${file}`,
  width,
  height,
  createdAt,
});

// ---------- Cómo se enseña una opinión ----------

// El autor: su nombre y su foto de perfil (nunca el email). Y las fotos, con su URL
async function withAuthors(reviews) {
  const users = [...new Map(reviews.filter((review) => review.user).map((review) => [String(review.user._id), review.user])).values()];
  const withCovers = await imageService.attachCovers("user", users);
  const byId = new Map(withCovers.map((user) => [String(user._id), { _id: user._id, name: user.name, coverImage: user.coverImage }]));
  return reviews.map((review) => ({
    ...review,
    user: byId.get(String(review.userId)) ?? null,
    photos: (review.photos ?? []).map(photoView),
  }));
}

// Para el panel: el título (o el nombre) y el slug de lo que se valora
async function withTargets(reviews) {
  const idsOf = (type) => [...new Set(reviews.filter((review) => review.targetType === type).map((review) => String(review.targetId)))];
  const [experiences, hosts] = await Promise.all([
    experienceRepository.findAll({ _id: { $in: idsOf(REVIEW_TARGETS.EXPERIENCE) } }),
    hostRepository.findAll({ _id: { $in: idsOf(REVIEW_TARGETS.HOST) } }),
  ]);
  const summaries = new Map([
    ...experiences.map((experience) => [String(experience._id), { _id: experience._id, name: experience.title, slug: experience.slug }]),
    ...hosts.map((host) => [String(host._id), { _id: host._id, name: host.name, slug: host.slug }]),
  ]);
  return reviews.map((review) => ({ ...review, target: summaries.get(String(review.targetId)) ?? null }));
}

const pagination = (total, page, limit) => ({ total, page, limit, totalPages: Math.ceil(total / limit) });

export const reviewService = {
  // ---------- El panel (solo admin) ----------

  // Listado con query params (utils/listQuery.js): filtros, orden y página. Con lo que se valora
  async search(query = {}) {
    const page = await findList(reviewRepository, await reviewListQuery.build(query));
    return { ...page, items: await withTargets(await withAuthors(page.items)) };
  },

  async listByActive(isActive) {
    return (await reviewService.search({ status: isActive ? "active" : "inactive" })).items;
  },

  async listDeleted() {
    return withTargets(await withAuthors(await reviewRepository.findDeleted()));
  },

  async getById(id) {
    const [review] = await withTargets(await withAuthors([await findExisting(reviewRepository, id, "Review")]));
    return review;
  },

  // ---------- Escribir (con sesión) ----------

  /** La opinión es de quien la escribe. Una por usuario y objetivo. */
  async create({ targetType, targetId, ...data }, actor) {
    const target = await findVisibleTarget(targetType, targetId);
    await assertCanReview(actor, targetType, target);
    if (await reviewRepository.exists({ userId: actor.id, targetType, targetId })) throw alreadyReviewed();

    let created;
    try {
      created = await reviewRepository.create({ ...data, targetType, targetId, userId: actor.id });
    } catch (error) {
      if (isDuplicate(error)) throw alreadyReviewed();
      throw error;
    }
    // Sin transacciones: el objetivo tiene que seguir vivo después de escribir
    const { repository, label } = TARGETS[targetType];
    await confirmReferences([{ repository, id: targetId, field: "targetId", resource: label.toLowerCase() }], () =>
      reviewRepository.deleteCreatedById(created._id),
    );

    await ratingService.afterReviewChange({ targetType, targetId });
    return reviewService.getById(created._id);
  },

  /** Solo su autor: el admin puede ocultarla o borrarla, pero no cambiar lo que alguien ha escrito. */
  async update(id, data, actor) {
    assertHasChanges(data);
    const review = await findCurrent(reviewRepository, id, "Review");
    if (String(review.userId) !== actor.id) throw forbidden();

    // La regla de las notas bajas con la opinión como quedaría (null quita el comentario)
    const rating = data.rating ?? review.rating;
    const comment = data.comment === undefined ? review.comment : (data.comment ?? undefined);
    if (missingLowRatingComment(rating, comment)) throw lowRatingComment();

    ensureWritten(await reviewRepository.updateById(id, data), "Review");
    if (data.rating !== undefined && data.rating !== review.rating) await ratingService.afterReviewChange(review);
    return reviewService.getById(id);
  },

  /** Ocultar (false) o volver a mostrar (true). Solo el admin: es la moderación. */
  async setActive(id, isActive) {
    const review = await findCurrent(reviewRepository, id, "Review");
    if (review.isActive !== isActive) {
      ensureWritten(await reviewRepository.updateById(id, { status: statusFromActive(isActive) }), "Review");
      await ratingService.afterReviewChange(review);
    }
    return reviewService.getById(id);
  },

  /** Su autor o el admin. A la papelera: el admin la puede restaurar. */
  async remove(id, actor) {
    const review = await findCurrent(reviewRepository, id, "Review");
    if (!isOwnerOrAdmin(actor, review)) throw forbidden();
    ensureWritten(await reviewRepository.softDeleteById(id), "Review");
    await ratingService.afterReviewChange(review);
  },

  /** Solo el admin. 409 si su objetivo se ha eliminado o su autor ya ha vuelto a opinar. */
  async restore(id, isActive, actor) {
    if (!isAdminUser(actor)) throw forbidden();
    const deleted = await findRestorable(reviewRepository, id, "Review");
    const { repository, label } = TARGETS[deleted.targetType];
    if (!(await repository.findPlainById(deleted.targetId))) {
      throw conflict(`Cannot restore: targetId references a deleted ${label.toLowerCase()}`);
    }
    if (await reviewRepository.exists({ userId: deleted.userId, targetType: deleted.targetType, targetId: deleted.targetId })) {
      throw alreadyReviewed();
    }

    try {
      await reviewRepository.restoreById(id, restoredStatus(isActive));
    } catch (error) {
      if (isDuplicate(error)) throw alreadyReviewed();
      throw error;
    }
    await ratingService.afterReviewChange(deleted);
    return reviewService.getById(id);
  },

  // ---------- Fotos ----------

  /**
   * Antes de recibir el archivo: que la opinión sea tuya y que quepa otra foto. Así no se escribe
   * en disco una foto que se va a rechazar. La comprobación de verdad es la de addPhoto.
   */
  async assertCanAddPhoto(id, actor) {
    const review = await findOwnReview(id, actor);
    const max = loadUploadsConfig().reviewPhotosMax;
    if ((review.photos?.length ?? 0) >= max) throw tooManyPhotos(max);
  },

  /**
   * Añade a tu opinión la foto que ha dejado multer en disco (upload: req.file). Si algo falla, el
   * archivo se borra (compensación, como en references.js). 409 TOO_MANY_PHOTOS si ya está llena.
   */
  async addPhoto(id, upload, actor) {
    const max = loadUploadsConfig().reviewPhotosMax;
    let filePath = upload.path;
    try {
      await findOwnReview(id, actor);
      const photo = await checkUploadedPhoto(upload);
      filePath = photo.path;
      const added = await reviewRepository.addPhoto(id, actor.id, {
        _id: new mongoose.Types.ObjectId(),
        file: photo.file,
        width: photo.width,
        height: photo.height,
        createdAt: new Date(),
      }, max);
      // Entre la comprobación y la escritura ha llegado otra foto (o se ha borrado la opinión)
      if (!added) throw tooManyPhotos(max);
    } catch (error) {
      await removeFile(filePath);
      throw error;
    }
    return reviewService.getById(id);
  },

  /** Quita una foto y borra su archivo. Su autor o el admin (la moderación). */
  async removePhoto(id, photoId, actor) {
    const review = await findCurrent(reviewRepository, id, "Review");
    if (!isOwnerOrAdmin(actor, review)) throw forbidden();
    const before = await reviewRepository.removePhoto(id, photoId);
    const photo = before?.photos.find((item) => String(item._id) === photoId);
    if (!photo) throw notFound("Photo");
    await removeFile(photoPath(photo.file));
    return reviewService.getById(id);
  },

  // ---------- La tienda ----------

  /**
   * Las opiniones visibles de una experiencia o un anfitrión visibles, por páginas, y su resumen:
   * la media, cuántas, cuántas de cada nota y cuántas con fotos. { data, pagination, summary }.
   * withPhotos: solo las que tienen fotos
   */
  async listForTarget(
    targetType,
    slug,
    { sort = "recent", rating, withPhotos = false, page = 1, limit = SHOP_REVIEWS_LIMIT.default } = {},
  ) {
    const target = await findVisibleTargetBySlug(targetType, slug);
    const base = { targetType, targetId: target._id };
    const hasPhotos = { "photos.0": { $exists: true } };
    const filter = { ...base, isActive: true, ...(rating !== undefined && { rating }), ...(withPhotos && hasPhotos) };

    const [items, total, summary, photoCount] = await Promise.all([
      reviewRepository.findAll(filter, { sort: SHOP_REVIEW_SORT[sort], skip: (page - 1) * limit, limit }),
      reviewRepository.count(filter),
      summarize(base),
      reviewRepository.count({ ...base, isActive: true, ...hasPhotos }),
    ]);
    return {
      data: await withAuthors(items),
      pagination: pagination(total, page, limit),
      summary: { ...summary, withPhotos: photoCount },
    };
  },

  /**
   * Para el formulario de la tienda: mi opinión sobre ese objetivo (o null) y si puedo opinar.
   * { review, canReview, reason }. reason: OWN_TARGET, REVIEW_ALREADY_EXISTS o null.
   */
  async mine(targetType, slug, actor) {
    const target = await findVisibleTargetBySlug(targetType, slug);
    const found = await reviewRepository.findByUserAndTarget(actor.id, targetType, target._id);
    const [review] = found ? await withAuthors([found]) : [null];
    const { allowed, reason } = await canReview(actor, targetType, target);
    if (!allowed) return { review, canReview: false, reason };
    if (review) return { review, canReview: false, reason: "REVIEW_ALREADY_EXISTS" };
    return { review: null, canReview: true, reason: null };
  },
};
