import { z } from "zod";
import { cannotChange } from "./common.schema.js";

// Una región vacía es "sin región": al crear no se guarda, y al editar se borra
const region = z.string().trim().max(80);

// La API trabaja con latitude y longitude; el service las guarda como punto GeoJSON
const locationFields = z.strictObject({
  city: z.string().trim().min(2).max(80),
  region: region.transform((value) => value || undefined).optional(),
  country: z.string().trim().min(2).max(80).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
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
