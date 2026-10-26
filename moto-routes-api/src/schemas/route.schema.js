import { z } from "zod";
import { cannotChange, clearable, objectIdSchema } from "./common.schema.js";

const routeFields = z.strictObject({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  // Kilómetros y horas: una ruta tiene que tener recorrido
  distance: z.number().positive().max(5000),
  duration: z.number().positive().max(240),
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
