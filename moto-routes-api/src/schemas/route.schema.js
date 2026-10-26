import { z } from "zod";
import { ROUTE_DIFFICULTIES, ROUTE_LIMITS as LIMITS } from "../models/route.model.js";
import { cannotChange, clearable, objectIdSchema } from "./common.schema.js";

const routeFields = z.strictObject({
  title: z.string().trim().min(LIMITS.titleMin).max(LIMITS.titleMax),
  description: z.string().trim().max(LIMITS.descriptionMax).optional(),
  difficulty: z.enum(ROUTE_DIFFICULTIES),
  // Kilómetros y horas: una ruta tiene que tener recorrido
  distance: z.number().positive().max(LIMITS.distanceMax),
  duration: z.number().positive().max(LIMITS.durationMax),
  categoryId: objectIdSchema,
  startLocationId: objectIdSchema,
  // Puede ser igual que startLocationId: ruta circular
  endLocationId: objectIdSchema,
});

export const createRouteSchema = routeFields;

export const updateRouteSchema = routeFields.partial().extend({
  ...clearable(routeFields, "description"),
  ...cannotChange("_id", "slug"),
});
