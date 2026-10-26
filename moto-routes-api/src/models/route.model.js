import mongoose from "mongoose";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";
import { STATUS } from "./status.js";
import { positive } from "./validators.js";

// Se mantiene el nombre antiguo para no romper los imports existentes
export const ROUTE_STATUS = STATUS;

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

routeSchema.plugin(statusPlugin);
routeSchema.plugin(slugPlugin, { source: (doc) => doc.title, fields: ["title"] });
routeSchema.plugin(softDeletePlugin);

export const Route = mongoose.model("Route", routeSchema);
