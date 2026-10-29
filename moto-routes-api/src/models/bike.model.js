import mongoose from "mongoose";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";
import { integer, positive } from "./validators.js";

// Límites de los campos: los usan este modelo y el esquema de Zod (schemas/bike.schema.js).
// Unidades: cc, cv, Nm, kg, mm y km. perUser: motos como mucho en el garaje de un usuario
export const BIKE_LIMITS = Object.freeze({
  brandMax: 50,
  modelMax: 80,
  versionMax: 80,
  yearMin: 1900,
  ccMin: 49,
  ccMax: 3000,
  hpMax: 350,
  torqueMax: 400,
  weightMin: 50,
  weightMax: 500,
  seatHeightMin: 500,
  seatHeightMax: 1100,
  kmMax: 2_000_000,
  colorMax: 40,
  nicknameMax: 40,
  modificationsMax: 30,
  modificationTitleMax: 80,
  modificationDescriptionMax: 500,
  perUser: 10,
});

// El año de una moto: como mucho, el modelo del año que viene
export const maxBikeYear = () => new Date().getFullYear() + 1;

export const BIKE_TYPES = Object.freeze([
  "naked",
  "sport",
  "touring",
  "trail",
  "adventure",
  "custom",
  "enduro",
  "scooter",
  "classic",
]);

export const MODIFICATION_TYPES = Object.freeze([
  "exhaust",
  "suspension",
  "brakes",
  "ecu",
  "luggage",
  "tyres",
  "ergonomics",
  "lighting",
  "aesthetics",
  "other",
]);

export const LICENSES = Object.freeze(["A1", "A2", "A"]);

/**
 * El carnet que pide una moto, según su potencia (y su cilindrada para el A1): A1 hasta
 * 15 cv (11 kW) y 125 cc; A2 hasta 47 cv (35 kW); A, el resto. Sin potencia, no se sabe.
 * Lo calcula la API: así nunca contradice la ficha.
 */
export function licenseFor({ cc, hp }) {
  if (hp == null) return null;
  if (hp <= 15 && (cc == null || cc <= 125)) return "A1";
  if (hp <= 47) return "A2";
  return "A";
}

const modificationSchema = new mongoose.Schema({
  type: { type: String, enum: MODIFICATION_TYPES, required: true },
  title: { type: String, required: true, trim: true, maxlength: BIKE_LIMITS.modificationTitleMax },
  description: { type: String, trim: true, maxlength: BIKE_LIMITS.modificationDescriptionMax },
  date: { type: Date },
});

/**
 * Una moto del garaje de un usuario (User 1 → N Bike). La ficha técnica es opcional salvo la
 * marca, el modelo y el tipo. Las fotos son imágenes con ownerType "bike". No se guardan ni la
 * matrícula ni el bastidor.
 */
const bikeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true, immutable: true },
    brand: { type: String, required: true, trim: true, maxlength: BIKE_LIMITS.brandMax },
    model: { type: String, required: true, trim: true, maxlength: BIKE_LIMITS.modelMax },
    version: { type: String, trim: true, maxlength: BIKE_LIMITS.versionMax },
    type: { type: String, enum: BIKE_TYPES, required: true },
    year: {
      type: Number,
      min: BIKE_LIMITS.yearMin,
      validate: [
        integer,
        { validator: (value) => value <= maxBikeYear(), message: "{PATH} cannot be later than next year" },
      ],
    },
    cc: { type: Number, min: BIKE_LIMITS.ccMin, max: BIKE_LIMITS.ccMax, validate: integer },
    hp: { type: Number, max: BIKE_LIMITS.hpMax, validate: positive },
    torque: { type: Number, max: BIKE_LIMITS.torqueMax, validate: positive },
    weight: { type: Number, min: BIKE_LIMITS.weightMin, max: BIKE_LIMITS.weightMax },
    seatHeight: { type: Number, min: BIKE_LIMITS.seatHeightMin, max: BIKE_LIMITS.seatHeightMax, validate: integer },
    km: { type: Number, min: 0, max: BIKE_LIMITS.kmMax, validate: integer },
    color: { type: String, trim: true, maxlength: BIKE_LIMITS.colorMax },
    nickname: { type: String, trim: true, maxlength: BIKE_LIMITS.nicknameMax },
    // Lo calcula el service con licenseFor(): nunca llega del cliente
    license: { type: String, enum: LICENSES },
    modifications: {
      type: [modificationSchema],
      default: [],
      validate: {
        validator: (list) => list.length <= BIKE_LIMITS.modificationsMax,
        message: `{PATH} cannot have more than ${BIKE_LIMITS.modificationsMax} items`,
      },
    },
    // La moto principal del usuario: como mucho una (la primera que da de alta lo es)
    isPrimary: { type: Boolean, default: false },
    // Las privadas solo las ven su dueño y el admin
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

bikeSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

bikeSchema.plugin(statusPlugin);
bikeSchema.plugin(slugPlugin, { source: (doc) => `${doc.brand} ${doc.model}`, fields: ["brand", "model"] });
bikeSchema.plugin(softDeletePlugin);

// Como mucho una moto principal por usuario. Con nombre propio: sin él chocaría con el índice
// de userId (los dos se llamarían "userId_1")
bikeSchema.index(
  { userId: 1 },
  { name: "one_primary_bike_per_user", unique: true, partialFilterExpression: { isPrimary: true } }
);

export const Bike = mongoose.model("Bike", bikeSchema);
