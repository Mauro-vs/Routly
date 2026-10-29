import mongoose from "mongoose";
import { SKU_PATTERN } from "../utils/sku.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";
import { integer, twoDecimals } from "./validators.js";

// Límites de los campos: los usan este modelo y el esquema de Zod (schemas/departure.schema.js).
// Precio en euros por persona
export const DEPARTURE_LIMITS = Object.freeze({ priceMax: 100000 });

// state es lo que pasa en el mundo real; status, si se muestra en el panel
export const DEPARTURE_STATES = Object.freeze(["scheduled", "cancelled", "completed"]);

const departureSchema = new mongoose.Schema(
  {
    experienceId: { type: mongoose.Schema.Types.ObjectId, ref: "Experience", required: true },
    // Si ese día el guía lleva otra moto; sin él, la de su experiencia
    guideBikeId: { type: mongoose.Schema.Types.ObjectId, ref: "Bike", index: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    capacity: { type: Number, required: true, min: 1, validate: integer },
    // Euros por persona
    price: {
      type: Number,
      required: true,
      min: 0,
      max: DEPARTURE_LIMITS.priceMax,
      validate: twoDecimals,
    },
    state: { type: String, enum: DEPARTURE_STATES, default: "scheduled" },
    // Código comercial fijo (RTL-DEP-AAMMDD-XXXXX, con la fecha del alta): lo genera el
    // service y no cambia nunca
    sku: { type: String, required: true, unique: true, immutable: true, match: SKU_PATTERN },
    // Lo calcula el service con el título de la experiencia y la fecha de salida
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

departureSchema.virtual("experience", {
  ref: "Experience",
  localField: "experienceId",
  foreignField: "_id",
  justOne: true,
});

departureSchema.plugin(statusPlugin);
departureSchema.plugin(softDeletePlugin);

// Para listar las fechas de una experiencia en orden
departureSchema.index({ experienceId: 1, startAt: 1 });

export const Departure = mongoose.model("Departure", departureSchema);
