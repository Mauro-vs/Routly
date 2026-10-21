import { z } from "zod";
import { cannotChange, objectIdSchema, statusSchema } from "./common.schema.js";

// Los campos que no aparecen en un esquema se descartan (comportamiento por
// defecto de z.object), así el cliente no puede fijar slug, isActive, deletedAt...

// Las piezas comunes se reexportan para no romper los imports existentes
export {
  idParamSchema,
  restoreSchema as restoreRouteSchema,
  setActiveSchema,
  slugParamSchema,
} from "./common.schema.js";

export const createRouteSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  distance: z.number().min(0),
  duration: z.number().min(0),
  categoryId: objectIdSchema,
  startLocationId: objectIdSchema,
  // Puede ser igual que startLocationId: ruta circular
  endLocationId: objectIdSchema,
});

export const updateRouteSchema = createRouteSchema.partial().extend({
  status: statusSchema.optional(),
  ...cannotChange("_id", "slug"),
});
