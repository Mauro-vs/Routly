import { z } from "zod";

// Piezas de validación que comparten todas las colecciones.
// Los body usan z.strictObject: un campo que no está en el esquema es un 400
// ("color is not allowed"), no se descarta sin avisar.

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const slugParamSchema = z.object({
  slug: z.string().max(200).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
});

// Activar y desactivar solo se hace con PATCH /:id/active: el PATCH /:id no acepta status
export const setActiveSchema = z.strictObject({
  isActive: z.boolean(),
});

/**
 * Campos que existen pero no se pueden cambiar en un PATCH. Sin esto, el cliente
 * recibiría un "is not allowed" genérico; así sabe el motivo: "sku cannot be changed".
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

/**
 * Campos opcionales que en un PATCH se pueden vaciar enviando null. El repositorio
 * convierte ese null en un $unset: el campo desaparece del documento.
 *
 * Uso: updateXSchema = fields.partial().extend({ ...clearable(fields, "description") })
 */
export function clearable(fields, ...names) {
  return Object.fromEntries(names.map((name) => [name, fields.shape[name].nullable()]));
}

// Al restaurar, isActive es opcional (si no llega, vuelve con el estado que tenía)
export const restoreSchema = setActiveSchema.partial();
