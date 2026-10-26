import mongoose from "mongoose";
import { slugPlugin } from "./plugins/slug.plugin.js";
import { softDeletePlugin } from "./plugins/softDelete.plugin.js";
import { statusPlugin } from "./plugins/status.plugin.js";

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
          longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90,
        message: "coordinates must be [longitude, latitude]",
      },
    },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    city: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    region: { type: String, trim: true, maxlength: 80 },
    country: { type: String, required: true, trim: true, minlength: 2, maxlength: 80, default: "España" },
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
