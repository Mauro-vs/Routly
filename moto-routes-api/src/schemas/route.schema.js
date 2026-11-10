import { z } from "zod";
import { ROUTE_DIFFICULTIES, ROUTE_LIMITS as LIMITS } from "../models/route.model.js";
import { atLeast, atMost, defineListQuery, equals, queryNumber } from "../utils/listQuery.js";
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

// Query params de GET /api/routes (utils/listQuery.js): los comunes y estos filtros
export const routeListQuery = defineListQuery({
  sort: ["title", "distance", "duration", "difficulty", "createdAt", "updatedAt"],
  // Por su nivel (fácil, media, difícil), no por el texto
  sortFields: { difficulty: "difficultyLevel" },
  filters: {
    difficulty: { schema: z.enum(ROUTE_DIFFICULTIES), to: equals("difficulty") },
    categoryId: { schema: objectIdSchema, to: equals("categoryId") },
    // De origen o de destino
    locationId: { schema: objectIdSchema, to: (id) => ({ $or: [{ startLocationId: id }, { endLocationId: id }] }) },
    distanceMin: { schema: queryNumber.pipe(z.number().min(0)), to: atLeast("distance") },
    distanceMax: { schema: queryNumber.pipe(z.number().min(0)), to: atMost("distance") },
    durationMin: { schema: queryNumber.pipe(z.number().min(0)), to: atLeast("duration") },
    durationMax: { schema: queryNumber.pipe(z.number().min(0)), to: atMost("duration") },
  },
  ranges: [
    ["distanceMin", "distanceMax"],
    ["durationMin", "durationMax"],
  ],
});
