import { RATING_VALUES, emptyRating } from "../models/rating.js";
import { REVIEW_TARGETS } from "../models/review.model.js";
import { experienceRepository } from "../repositories/experience.repository.js";
import { hostRepository } from "../repositories/host.repository.js";
import { reviewRepository } from "../repositories/review.repository.js";
import { routeRepository } from "../repositories/route.repository.js";

/*
 * Las notas medias que se guardan (models/rating.js):
 *
 *   experiencia  rating             sus opiniones
 *   anfitrión    rating             sus opiniones como guía
 *                experiencesRating  las opiniones de todas sus experiencias activas, juntas
 *   ruta         rating             las opiniones de todas las experiencias activas que la usan
 *
 * Solo cuentan las opiniones visibles (activas) y no eliminadas. Siempre se recalculan con una
 * agregación desde las opiniones, nunca sumando y restando: así no se desincronizan aunque dos
 * peticiones lleguen a la vez o algo falle a mitad.
 */

const round = (value) => Math.round(value * 100) / 100;

/** La nota de las opiniones que cumplen el filtro (solo cuentan las visibles). */
export async function summarize(filter) {
  const rows = await reviewRepository.countByRating(filter);
  const rating = emptyRating();
  let total = 0;
  for (const { _id: value, count } of rows) {
    if (!RATING_VALUES.includes(value)) continue;
    rating.distribution[String(value)] = count;
    rating.count += count;
    total += value * count;
  }
  rating.average = rating.count === 0 ? 0 : round(total / rating.count);
  return rating;
}

const ofExperiences = async (filter) => {
  const ids = await experienceRepository.findIds({ ...filter, isActive: true });
  return summarize({ targetType: REVIEW_TARGETS.EXPERIENCE, targetId: { $in: ids } });
};

// Lo que tendría que valer cada nota ahora mismo
const expected = {
  experience: async (id) => ({ rating: await summarize({ targetType: REVIEW_TARGETS.EXPERIENCE, targetId: id }) }),
  host: async (id) => ({
    rating: await summarize({ targetType: REVIEW_TARGETS.HOST, targetId: id }),
    experiencesRating: await ofExperiences({ hostId: id }),
  }),
  route: async (id) => ({ rating: await ofExperiences({ routeId: id }) }),
};

const REPOSITORIES = { experience: experienceRepository, host: hostRepository, route: routeRepository };
const FIELDS = { experience: ["rating"], host: ["rating", "experiencesRating"], route: ["rating"] };

async function recalculate(kind, id) {
  if (!id) return;
  await REPOSITORIES[kind].setRatings(id, await expected[kind](id));
}

const unique = (ids) => [...new Set(ids.filter(Boolean).map(String))];

export const ratingService = {
  recalculateExperience: (id) => recalculate("experience", id),
  recalculateHost: (id) => recalculate("host", id),
  recalculateRoute: (id) => recalculate("route", id),

  /**
   * Después de crear, editar, ocultar, mostrar, borrar o restaurar una opinión. La de una
   * experiencia cambia su nota, la de sus experiencias en su anfitrión y la de su ruta; la de un
   * anfitrión, solo la suya.
   */
  async afterReviewChange({ targetType, targetId }) {
    if (targetType === REVIEW_TARGETS.HOST) return ratingService.recalculateHost(targetId);

    await ratingService.recalculateExperience(targetId);
    const experience = await experienceRepository.findPlainById(targetId);
    if (!experience) return;
    await Promise.all([
      ratingService.recalculateHost(experience.hostId),
      ratingService.recalculateRoute(experience.routeId),
    ]);
  },

  /**
   * Después de que una experiencia cambie de anfitrión o de ruta, se active, se desactive, se
   * elimine o se restaure: las notas de sus anfitriones y sus rutas, los de antes y los de ahora.
   *
   * @param experiences la experiencia antes y después del cambio (o solo una)
   */
  async afterExperienceChange(...experiences) {
    const present = experiences.filter(Boolean);
    await Promise.all([
      ...unique(present.map((experience) => experience.hostId)).map((id) => ratingService.recalculateHost(id)),
      ...unique(present.map((experience) => experience.routeId)).map((id) => ratingService.recalculateRoute(id)),
    ]);
  },

  /** Recalcula todas las notas (el seed de opiniones y npm run check:integrity -- --fix). */
  async recalculateAll() {
    for (const kind of Object.keys(REPOSITORIES)) {
      for (const { _id } of await REPOSITORIES[kind].findRatings()) await recalculate(kind, _id);
    }
  },

  /**
   * Al arrancar la API (server.js): calcula las notas de los documentos de antes de que
   * existieran, que no tienen el campo. Los que ya lo tienen no se tocan, así que después de la
   * primera vez no hace nada.
   */
  async fillMissing() {
    for (const kind of Object.keys(REPOSITORIES)) {
      for (const document of await REPOSITORIES[kind].findRatings()) {
        if (FIELDS[kind].some((field) => !document[field])) await recalculate(kind, document._id);
      }
    }
  },

  /**
   * Las notas guardadas que no cuadran con las opiniones: { kind, id, field, stored, expected }.
   * Un documento de antes de existir las notas (sin el campo) también cuenta.
   */
  async findMismatches() {
    const mismatches = [];
    for (const kind of Object.keys(REPOSITORIES)) {
      for (const document of await REPOSITORIES[kind].findRatings()) {
        const shouldBe = await expected[kind](document._id);
        for (const [field, value] of Object.entries(shouldBe)) {
          if (!sameRating(document[field], value)) {
            mismatches.push({ kind, id: String(document._id), field, stored: document[field] ?? null, expected: value });
          }
        }
      }
    }
    return mismatches;
  },
};

function sameRating(stored, value) {
  if (!stored) return false;
  return (
    stored.average === value.average &&
    stored.count === value.count &&
    RATING_VALUES.every((star) => (stored.distribution?.[String(star)] ?? 0) === value.distribution[String(star)])
  );
}
