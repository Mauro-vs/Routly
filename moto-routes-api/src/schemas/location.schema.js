import { z } from "zod";
import { LOCATION_LIMITS as LIMITS } from "../models/location.model.js";
import { cannotChange } from "./common.schema.js";

// Una región vacía es "sin región": al crear no se guarda, y al editar se borra
const region = z.string().trim().max(LIMITS.regionMax);

// La API trabaja con latitude y longitude; el service las guarda como punto GeoJSON
const locationFields = z.strictObject({
  city: z.string().trim().min(LIMITS.cityMin).max(LIMITS.cityMax),
  region: region.transform((value) => value || undefined).optional(),
  country: z.string().trim().min(LIMITS.countryMin).max(LIMITS.countryMax).optional(),
  latitude: z.number().min(-LIMITS.latitudeMax).max(LIMITS.latitudeMax).optional(),
  longitude: z.number().min(-LIMITS.longitudeMax).max(LIMITS.longitudeMax).optional(),
});

// Las dos o ninguna; al editar, también las dos a null para quitar las coordenadas
const bothOrNone = (data) =>
  (data.latitude === undefined) === (data.longitude === undefined) &&
  (data.latitude === null) === (data.longitude === null);
const bothOrNoneError = {
  message: "latitude and longitude must be sent together",
  path: ["latitude"],
};

export const createLocationSchema = locationFields.refine(bothOrNone, bothOrNoneError);

export const updateLocationSchema = locationFields
  .partial()
  .extend({
    region: region.transform((value) => value || null).nullable().optional(),
    latitude: locationFields.shape.latitude.nullable(),
    longitude: locationFields.shape.longitude.nullable(),
    ...cannotChange("_id", "slug"),
  })
  .refine(bothOrNone, bothOrNoneError);
