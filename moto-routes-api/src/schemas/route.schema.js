import { z } from "zod";
import { ROUTE_STATUS } from "../models/route.model.js";

// Los campos que no aparecen en un esquema se descartan (comportamiento por
// defecto de z.object), así el cliente no puede fijar slug, isActive, deletedAt...

export const createRouteSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  distance: z.number().min(0),
  duration: z.number().min(0),
  startPoint: z.string().trim().min(1).max(100),
  endPoint: z.string().trim().min(1).max(100),
});

// `deleted` solo se alcanza con el soft delete (PATCH /:id/delete), nunca desde el cliente
export const updateRouteSchema = createRouteSchema.partial().extend({
  status: z.enum([ROUTE_STATUS.ACTIVE, ROUTE_STATUS.INACTIVE]).optional(),
});

export const setActiveSchema = z.object({
  isActive: z.boolean(),
});

// Al restaurar, isActive es opcional (si no llega, la ruta vuelve inactiva)
export const restoreRouteSchema = setActiveSchema.partial();

export const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/),
});

export const slugParamSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
});
