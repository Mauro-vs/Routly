import { z } from "zod";
import { cannotChange, statusSchema } from "./common.schema.js";

// La API trabaja con latitude y longitude; el service las guarda como punto GeoJSON
const locationFields = z.object({
  city: z.string().trim().min(2).max(80),
  region: z.string().trim().max(80).optional(),
  country: z.string().trim().min(2).max(80).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const bothOrNone = (data) => (data.latitude === undefined) === (data.longitude === undefined);
const bothOrNoneError = {
  message: "latitude and longitude must be sent together",
  path: ["latitude"],
};

export const createLocationSchema = locationFields.refine(bothOrNone, bothOrNoneError);

export const updateLocationSchema = locationFields
  .partial()
  .extend({ status: statusSchema.optional(), ...cannotChange("_id", "slug") })
  .refine(bothOrNone, bothOrNoneError);
