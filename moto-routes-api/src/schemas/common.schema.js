import { z } from "zod";
import { STATUS } from "../models/status.js";

// Piezas de validación que comparten todas las colecciones

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const slugParamSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
});

// `deleted` solo se alcanza con el soft delete (PATCH /:id/delete), nunca desde el cliente
export const statusSchema = z.enum([STATUS.ACTIVE, STATUS.INACTIVE]);

export const setActiveSchema = z.object({
  isActive: z.boolean(),
});

// Al restaurar, isActive es opcional (si no llega, el documento vuelve inactivo)
export const restoreSchema = setActiveSchema.partial();
