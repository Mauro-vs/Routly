import mongoose from "mongoose";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";
import { TEXT_INDEX } from "./textIndex.js";
import { integer } from "./validators.js";

// Lo que se puede valorar con una opinión (targetType). Las rutas no: su nota es la de las
// experiencias que la usan (services/rating.service.js). Es el único sitio donde se definen: los
// usan este modelo, el esquema de Zod y los services.
export const REVIEW_TARGETS = Object.freeze({
  EXPERIENCE: "experience",
  HOST: "host",
});

export const REVIEW_TARGET_TYPES = Object.freeze(Object.values(REVIEW_TARGETS));

// Límites de los campos: los usan este modelo y el esquema de Zod (schemas/review.schema.js).
// Con lowRatingMax estrellas o menos, el comentario es obligatorio y de lowRatingCommentMin
// caracteres como mínimo: una nota mala tiene que venir explicada
export const REVIEW_LIMITS = Object.freeze({
  ratingMin: 1,
  ratingMax: 5,
  titleMax: 100,
  commentMin: 10,
  commentMax: 2000,
  lowRatingMax: 2,
  lowRatingCommentMin: 30,
});

/** Si a esa nota le falta un comentario suficiente (la regla de las notas bajas). */
export function missingLowRatingComment(rating, comment) {
  return rating <= REVIEW_LIMITS.lowRatingMax && (comment?.trim().length ?? 0) < REVIEW_LIMITS.lowRatingCommentMin;
}

export const LOW_RATING_MESSAGE =
  `comment is required with ${REVIEW_LIMITS.lowRatingMax} stars or less ` +
  `(at least ${REVIEW_LIMITS.lowRatingCommentMin} characters)`;

// Una foto de la opinión. Solo se guarda el nombre del archivo en disco (config/uploads.js); la
// URL se forma al enseñarla. width y height, de la cabecera del archivo (null si no se pudo leer)
const photoSchema = new mongoose.Schema({
  file: { type: String, required: true },
  width: { type: Number, default: null },
  height: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
});

/**
 * Una opinión de un usuario sobre una experiencia o un anfitrión (targetType + targetId, como las
 * imágenes con ownerType). Cada usuario tiene como mucho una por experiencia y una por anfitrión.
 *
 * El estado es el de todas las colecciones (statusPlugin): activa = visible; inactiva = oculta por
 * el admin (moderación). Una opinión oculta o eliminada no se ve en la tienda ni cuenta en la nota.
 */
const reviewSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: REVIEW_TARGET_TYPES, required: true, immutable: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
    // Lo pone el service con el usuario de la sesión: nunca llega del cliente
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true, immutable: true },
    rating: {
      type: Number,
      required: true,
      min: REVIEW_LIMITS.ratingMin,
      max: REVIEW_LIMITS.ratingMax,
      validate: integer,
    },
    title: { type: String, trim: true, maxlength: REVIEW_LIMITS.titleMax },
    comment: { type: String, trim: true, minlength: REVIEW_LIMITS.commentMin, maxlength: REVIEW_LIMITS.commentMax },
    // "Ha hecho esta ruta": hará falta una reserva (colección bookings, todavía no existe). Hasta
    // entonces siempre false; la regla de quién puede opinar está en reviewService.canReview
    verified: { type: Boolean, default: false },
    // Se añaden y se quitan de una en una (POST y DELETE /api/reviews/:id/photos); el máximo
    // (REVIEW_PHOTOS_MAX) lo comprueba el repositorio en la misma escritura
    photos: { type: [photoSchema], default: [] },
  },
  { timestamps: true }
);

reviewSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

// Segunda barrera de la regla de las notas bajas al crear (el PATCH la comprueba el service con la
// opinión ya combinada: findOneAndUpdate no pasa por aquí)
reviewSchema.pre("validate", function () {
  if (missingLowRatingComment(this.rating, this.comment)) {
    this.invalidate("comment", LOW_RATING_MESSAGE);
  }
});

reviewSchema.plugin(statusPlugin);
reviewSchema.plugin(softDeletePlugin);

// Una opinión por usuario y objetivo, sin contar las de la papelera: quien borra la suya puede
// volver a opinar. $type null y no deletedAt: null, que un índice parcial no admite
reviewSchema.index(
  { userId: 1, targetType: 1, targetId: 1 },
  { name: "one_review_per_user_and_target", unique: true, partialFilterExpression: { deletedAt: { $type: "null" } } }
);
// El listado de la tienda: las visibles de un objetivo, de la más reciente a la más antigua
reviewSchema.index({ targetType: 1, targetId: 1, isActive: 1, createdAt: -1 });
// El buscador del panel (?q=): en el título y el comentario
reviewSchema.index({ title: "text", comment: "text" }, TEXT_INDEX);

export const Review = mongoose.model("Review", reviewSchema);
