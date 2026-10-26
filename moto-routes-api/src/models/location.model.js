import mongoose from "mongoose";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";

// Límites de los campos: los usan este modelo y el esquema de Zod (schemas/location.schema.js).
export const LOCATION_LIMITS = Object.freeze({
  cityMin: 2,
  cityMax: 80,
  regionMax: 80,
  countryMin: 2,
  countryMax: 80,
  latitudeMax: 90,
  longitudeMax: 180,
});

// Ciudad, región y país se comparan sin distinguir mayúsculas ni tildes
export const LOCATION_COLLATION = Object.freeze({ locale: "es", strength: 1 });

// Punto GeoJSON: el orden es [longitud, latitud]
const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: ([longitude, latitude] = []) =>
          Math.abs(longitude) <= LOCATION_LIMITS.longitudeMax &&
          Math.abs(latitude) <= LOCATION_LIMITS.latitudeMax,
        message: "coordinates must be [longitude, latitude]",
      },
    },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
      trim: true,
      minlength: LOCATION_LIMITS.cityMin,
      maxlength: LOCATION_LIMITS.cityMax,
    },
    region: { type: String, trim: true, maxlength: LOCATION_LIMITS.regionMax },
    country: {
      type: String,
      required: true,
      trim: true,
      minlength: LOCATION_LIMITS.countryMin,
      maxlength: LOCATION_LIMITS.countryMax,
      default: "España",
    },
    coordinates: { type: pointSchema, default: undefined },
  },
  { timestamps: true }
);

locationSchema.plugin(statusPlugin);
locationSchema.plugin(slugPlugin, { source: (doc) => doc.city, fields: ["city"] });
locationSchema.plugin(softDeletePlugin);

locationSchema.index({ city: 1, region: 1, country: 1 }, { unique: true, collation: LOCATION_COLLATION });
// Preparado para búsquedas por cercanía
locationSchema.index({ coordinates: "2dsphere" });

export const Location = mongoose.model("Location", locationSchema);
