import { z } from "zod";
import { STATUS } from "../models/status.js";

// Piezas de validación que comparten todas las colecciones

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const slugParamSchema = z.object({
  slug: z.string().max(200).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
});

// `deleted` solo se alcanza con el soft delete (PATCH /:id/delete), nunca desde el cliente
export const statusSchema = z.enum([STATUS.ACTIVE, STATUS.INACTIVE]);

export const setActiveSchema = z.object({
  isActive: z.boolean(),
});

/**
 * Campos que existen pero no se pueden cambiar en un PATCH. Sin esto, Zod los
 * descartaría sin avisar; así el cliente recibe un 400 en el campo:
 * "sku cannot be changed".
 *
 * Uso: updateXSchema = fields.partial().extend({ ...cannotChange("_id", "slug") })
 */
export function cannotChange(...fields) {
  return Object.fromEntries(
    fields.map((field) => [
      field,
      // optional(): si no llega, no se valida; si llega con cualquier valor, falla
      z
        .any()
        .refine((value) => value === undefined, { message: `${field} cannot be changed` })
        .optional(),
    ])
  );
}

// Al restaurar, isActive es opcional (si no llega, el documento vuelve inactivo)
export const restoreSchema = setActiveSchema.partial();
