import mongoose from "mongoose";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";
import { integer, positive } from "./validators.js";

// Límites de los campos: los usan este modelo y el esquema de Zod (schemas/experience.schema.js).
// Duración en horas, con paradas: como mucho 30 días
export const EXPERIENCE_LIMITS = Object.freeze({
  titleMin: 2,
  titleMax: 120,
  descriptionMax: 2000,
  meetingPointMax: 200,
  durationMax: 720,
  participantsMax: 100,
});

// Idiomas en los que se puede ofrecer una experiencia (los mismos que el panel)
export const EXPERIENCE_LANGUAGES = Object.freeze([
  "es",
  "en",
  "fr",
  "de",
  "it",
  "pt",
  "ca",
  "eu",
  "gl",
]);

// Salida guiada que un anfitrión organiza sobre una ruta
const experienceSchema = new mongoose.Schema(
  {
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "Host", required: true, index: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true, index: true },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: EXPERIENCE_LIMITS.titleMin,
      maxlength: EXPERIENCE_LIMITS.titleMax,
    },
    description: { type: String, trim: true, maxlength: EXPERIENCE_LIMITS.descriptionMax },
    meetingPoint: { type: String, trim: true, maxlength: EXPERIENCE_LIMITS.meetingPointMax },
    language: {
      type: String,
      lowercase: true,
      trim: true,
      enum: EXPERIENCE_LANGUAGES,
      default: "es",
    },
    // Horas totales de la experiencia, con paradas
    duration: {
      type: Number,
      required: true,
      max: EXPERIENCE_LIMITS.durationMax,
      validate: positive,
    },
    minParticipants: { type: Number, min: 1, default: 1, validate: integer },
    maxParticipants: {
      type: Number,
      required: true,
      min: 1,
      max: EXPERIENCE_LIMITS.participantsMax,
      validate: integer,
    },
  },
  { timestamps: true }
);

experienceSchema.virtual("host", {
  ref: "Host",
  localField: "hostId",
  foreignField: "_id",
  justOne: true,
});
experienceSchema.virtual("route", {
  ref: "Route",
  localField: "routeId",
  foreignField: "_id",
  justOne: true,
});

experienceSchema.plugin(statusPlugin);
experienceSchema.plugin(slugPlugin, { source: (doc) => doc.title, fields: ["title"] });
experienceSchema.plugin(softDeletePlugin);

export const Experience = mongoose.model("Experience", experienceSchema);
