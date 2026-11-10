import mongoose from "mongoose";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";
import { positive } from "./validators.js";
import { TEXT_INDEX } from "./textIndex.js";

// Límites de los campos: los usan este modelo y el esquema de Zod (schemas/route.schema.js).
// Distancia en km y duración en horas
export const ROUTE_LIMITS = Object.freeze({
  titleMin: 2,
  titleMax: 120,
  descriptionMax: 500,
  distanceMax: 5000,
  durationMax: 240,
});

export const ROUTE_DIFFICULTIES = Object.freeze(["easy", "medium", "hard"]);
// Su nivel, para ordenar por dificultad (sort=difficulty): como texto saldría easy, hard, medium
export const DIFFICULTY_LEVELS = Object.freeze({ easy: 1, medium: 2, hard: 3 });

const routeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: ROUTE_LIMITS.titleMin,
      maxlength: ROUTE_LIMITS.titleMax,
    },
    description: { type: String, trim: true, maxlength: ROUTE_LIMITS.descriptionMax },
    difficulty: { type: String, required: true, enum: ROUTE_DIFFICULTIES },
    // Interno: lo pone el modelo a partir de difficulty y no sale en las respuestas
    difficultyLevel: { type: Number, select: false },
    distance: { type: Number, required: true, max: ROUTE_LIMITS.distanceMax, validate: positive },
    duration: { type: Number, required: true, max: ROUTE_LIMITS.durationMax, validate: positive },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    startLocationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    // Puede ser la misma que el origen: ruta circular
    endLocationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true, index: true },
  },
  { timestamps: true }
);

// Las respuestas traen los ids y, además, los documentos relacionados (populate)
routeSchema.virtual("category", {
  ref: "Category",
  localField: "categoryId",
  foreignField: "_id",
  justOne: true,
});
routeSchema.virtual("startLocation", {
  ref: "Location",
  localField: "startLocationId",
  foreignField: "_id",
  justOne: true,
});
routeSchema.virtual("endLocation", {
  ref: "Location",
  localField: "endLocationId",
  foreignField: "_id",
  justOne: true,
});

// difficultyLevel sigue siempre a difficulty: al crear y al editar
routeSchema.pre("validate", function () {
  if (this.difficulty) this.difficultyLevel = DIFFICULTY_LEVELS[this.difficulty];
});
routeSchema.pre(["findOneAndUpdate", "updateOne", "updateMany"], function () {
  const update = this.getUpdate() ?? {};
  const difficulty = update.difficulty ?? update.$set?.difficulty;
  if (difficulty) this.set("difficultyLevel", DIFFICULTY_LEVELS[difficulty]);
});

/** Pone el nivel a las rutas que aún no lo tienen (las de antes de existir el campo). */
routeSchema.statics.syncDifficultyLevels = async function () {
  await Promise.all(
    Object.entries(DIFFICULTY_LEVELS).map(([difficulty, level]) =>
      this.updateMany({ difficulty, difficultyLevel: { $ne: level } }, { $set: { difficultyLevel: level } }).setOptions({
        withDeleted: true,
      }),
    ),
  );
};

routeSchema.plugin(statusPlugin);
routeSchema.plugin(slugPlugin, { source: (doc) => doc.title, fields: ["title"] });
routeSchema.plugin(softDeletePlugin);

// ?q= busca en el título y la descripción; los filtros por dificultad y distancia, con su índice
routeSchema.index({ title: "text", description: "text" }, TEXT_INDEX);
routeSchema.index({ difficulty: 1 });
routeSchema.index({ difficultyLevel: 1 });
routeSchema.index({ distance: 1 });

export const Route = mongoose.model("Route", routeSchema);
