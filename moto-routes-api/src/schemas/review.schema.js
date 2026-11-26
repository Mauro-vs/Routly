import { z } from "zod";
import { LOW_RATING_MESSAGE, REVIEW_LIMITS as LIMITS, missingLowRatingComment } from "../models/review.model.js";
import { REVIEW_TARGET_TYPES } from "../models/reviewTargets.js";
import { defineListQuery, equals, queryBoolean, queryNumber } from "../utils/listQuery.js";
import { cannotChange, objectIdSchema } from "./common.schema.js";

// Un texto vacío ("" o solo espacios) es como no enviarlo: el comentario y el título son opcionales
const blankToUndefined = (value) => (typeof value === "string" && value.trim() === "" ? undefined : value);

const rating = z.number().int().min(LIMITS.ratingMin).max(LIMITS.ratingMax);
const title = z.preprocess(blankToUndefined, z.string().trim().max(LIMITS.titleMax).optional());
const comment = z.preprocess(
  blankToUndefined,
  z.string().trim().min(LIMITS.commentMin).max(LIMITS.commentMax).optional(),
);

// La regla de las notas bajas: con 1 o 2 estrellas el comentario es obligatorio (30 caracteres).
// Aquí solo se ve lo que llega; en un PATCH, el service la comprueba con la opinión combinada
const lowRatingRule = (data, ctx) => {
  if (missingLowRatingComment(data.rating, data.comment ?? undefined)) {
    // params.code: el errorHandler lo pone en la respuesta, como el del service
    ctx.addIssue({ code: "custom", path: ["comment"], message: LOW_RATING_MESSAGE, params: { code: "COMMENT_REQUIRED_FOR_LOW_RATING" } });
  }
};

// En el PATCH solo se puede decidir aquí si llegan las dos cosas; si falta una, la decide el service
const lowRatingRuleIfBoth = (data, ctx) => {
  if (data.rating !== undefined && data.comment !== undefined) lowRatingRule(data, ctx);
};

// userId no está: la opinión es siempre de quien la escribe. verified tampoco: lo pondrán las reservas
export const createReviewSchema = z
  .strictObject({
    targetType: z.enum(REVIEW_TARGET_TYPES),
    targetId: objectIdSchema,
    rating,
    title,
    comment,
  })
  .superRefine(lowRatingRule);

// Solo el texto y la nota. null vacía el título o el comentario (si la nota lo permite)
export const updateReviewSchema = z
  .strictObject({
    rating: rating.optional(),
    title: z.preprocess(blankToUndefined, z.string().trim().max(LIMITS.titleMax).nullable().optional()),
    comment: z.preprocess(blankToUndefined, z.string().trim().min(LIMITS.commentMin).max(LIMITS.commentMax).nullable().optional()),
    ...cannotChange("_id", "targetType", "targetId", "userId", "verified", "status", "isActive"),
  })
  .superRefine(lowRatingRuleIfBoth);

// Query params de GET /api/reviews (solo admin; utils/listQuery.js): los comunes y estos filtros.
// status=active son las visibles; status=inactive, las ocultas
export const reviewListQuery = defineListQuery({
  sort: ["rating", "createdAt", "updatedAt"],
  filters: {
    targetType: { schema: z.enum(REVIEW_TARGET_TYPES), to: equals("targetType") },
    targetId: { schema: objectIdSchema, to: equals("targetId") },
    userId: { schema: objectIdSchema, to: equals("userId") },
    rating: { schema: queryNumber.pipe(rating), to: equals("rating") },
  },
});

/** Los órdenes de las opiniones en la tienda. */
export const SHOP_REVIEW_SORT = Object.freeze({
  recent: { createdAt: -1, _id: -1 },
  best: { rating: -1, createdAt: -1, _id: -1 },
  worst: { rating: 1, createdAt: -1, _id: -1 },
});

export const SHOP_REVIEWS_LIMIT = Object.freeze({ default: 10, max: 20 });

/** GET /api/shop/experiences/:slug/reviews y /api/shop/hosts/:slug/reviews. */
export const shopReviewsQuery = z.strictObject({
  sort: z.enum(Object.keys(SHOP_REVIEW_SORT)).optional(),
  rating: queryNumber.pipe(rating).optional(),
  withPhotos: queryBoolean.optional(),
  page: queryNumber.pipe(z.number().int().min(1)).optional(),
  limit: queryNumber.pipe(z.number().int().min(1).max(SHOP_REVIEWS_LIMIT.max)).optional(),
});

/** POST /api/reviews/:id/photos y DELETE /api/reviews/:id/photos/:photoId. */
export const photoParamSchema = z.strictObject({ id: objectIdSchema, photoId: objectIdSchema });
