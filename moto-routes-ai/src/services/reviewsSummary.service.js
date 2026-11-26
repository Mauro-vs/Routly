import { reviewsSummarySchema } from "../schemas/reviewsSummary.schema.js";
import { reviewsSummarySystem, reviewsSummaryUserMessage } from "../prompts/reviewsSummary.prompt.js";
import { aiUnavailable, createError } from "../utils/errors.js";
import { extractJson, shortHash } from "../utils/json.js";
import { createCache } from "./cache.js";

const DAY = 24 * 60 * 60 * 1000;

/** Cuántas opiniones se leen como mucho: las más recientes */
export const REVIEWS_TO_READ = 100;
/** Cuántas opiniones con comentario hacen falta para resumir */
export const MIN_REVIEWS = 3;
/** Lo que se le pasa a la IA de cada comentario, como mucho (los caracteres de más se cortan) */
export const COMMENT_CHARS = 600;

const clip = (value, max) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value);

/**
 * El agente de resumen de opiniones: lee las 100 opiniones más recientes de una experiencia o de un
 * guía en la tienda (lo mismo que ve cualquier visitante) y la IA resume qué gusta, qué se puede
 * mejorar y de qué se habla. Una sola llamada a la IA, que responde JSON (comprobado con Zod).
 *
 * - Las opiniones sin comentario cuentan para la nota, pero no se mandan (no hay nada que resumir).
 *   Con menos de 3 con comentario, no hay resumen: null, y la web no enseña el bloque.
 * - Se guarda 24 h. La clave lleva un hash de los _id y updatedAt de las opiniones: una opinión nueva,
 *   editada u oculta lo vuelve a escribir en la siguiente visita.
 */
export function createReviewsSummaryService({ catalog, openRouter, now = Date.now }) {
  const cache = createCache({ ttlMs: DAY, max: 500, now });

  async function generate(type, facts) {
    const messages = [
      { role: "system", content: reviewsSummarySystem(type) },
      { role: "user", content: reviewsSummaryUserMessage(facts) },
    ];
    // Dos intentos, sin response_format (como en los textos del detalle)
    for (let attempt = 1; attempt <= 2; attempt++) {
      const answer = await openRouter.complete({ messages, temperature: 0.3 });
      const parsed = reviewsSummarySchema.safeParse(extractJson(answer.content));
      if (parsed.success) return { ...parsed.data, model: answer.model };
      const preview = String(answer.content ?? "").replace(/\s+/g, " ").slice(0, 160);
      console.warn(`[reviews-summary] ${answer.model} answered invalid JSON (attempt ${attempt}): ${preview || "(empty)"}`);
    }
    throw createError("The AI returned an invalid answer, please try again later", 502);
  }

  // De qué o de quién son las opiniones, para que la IA hable de ello
  async function subjectOf(type, slug) {
    if (type === "host") return { tipo: "guía", nombre: (await catalog.host(slug)).name };
    const experience = await catalog.experience(slug);
    return { tipo: "experiencia", nombre: experience.title, ruta: experience.route?.title ?? null };
  }

  return {
    /** type: "experience" o "host". */
    async forTarget(type, slug) {
      if (!openRouter.enabled) throw aiUnavailable();

      const { reviews, summary } = await catalog.recentReviews(type, slug, REVIEWS_TO_READ);
      const withComment = reviews.filter((review) => review.comment?.trim());
      if (withComment.length < MIN_REVIEWS) return null;

      const key = `${type}:${slug}:${shortHash(withComment.map((review) => [review._id, review.updatedAt]))}`;
      return cache.wrap(key, async () => {
        const facts = {
          ...(await subjectOf(type, slug)),
          nota: summary ? { media: summary.average, opiniones: summary.count } : null,
          opiniones: withComment.map((review) => ({
            rating: review.rating,
            ...(review.title?.trim() && { title: clip(review.title.trim(), 120) }),
            comment: clip(review.comment.trim(), COMMENT_CHARS),
          })),
        };
        return {
          ...(await generate(type, facts)),
          basedOn: withComment.length,
          generatedAt: new Date(now()).toISOString(),
        };
      });
    },
  };
}
