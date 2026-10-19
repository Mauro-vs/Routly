import mongoose from "mongoose";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";
import { integer } from "./validators.js";
import { DELETED_FIELDS } from "./status.js";

// Salida guiada que un anfitrión organiza sobre una ruta
const experienceSchema = new mongoose.Schema(
  {
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "Host", required: true, index: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000 },
    meetingPoint: { type: String, trim: true, maxlength: 200 },
    language: { type: String, lowercase: true, trim: true, match: /^[a-z]{2}$/, default: "es" },
    // Horas totales de la experiencia, con paradas
    duration: { type: Number, required: true, min: 0 },
    minParticipants: { type: Number, min: 1, default: 1, validate: integer },
    maxParticipants: { type: Number, required: true, min: 1, max: 100, validate: integer },
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
experienceSchema.plugin(softDeletePlugin, { deletedFields: DELETED_FIELDS });

export const Experience = mongoose.model("Experience", experienceSchema);
