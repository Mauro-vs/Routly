import { z } from "zod";
import { DEPARTURE_STATES } from "../models/departure.model.js";
import { SKU_PATTERN } from "../utils/sku.js";
import { cannotChange, objectIdSchema, statusSchema } from "./common.schema.js";

// sku y slug no están en el esquema: los genera el service

// Solo texto ISO 8601 con hora y zona: "2026-11-08T08:00:00.000Z" o "...+01:00".
// z.coerce.date() aceptaba cualquier cosa convertible (true, 0, "2026").
const isoDate = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

const departureFields = z.object({
  experienceId: objectIdSchema,
  startAt: isoDate,
  endAt: isoDate,
  capacity: z.number().int().min(1),
  // Euros por persona, con dos decimales como máximo
  price: z.number().min(0).multipleOf(0.01),
  state: z.enum(DEPARTURE_STATES).optional(),
});

const datesError = { message: "endAt must be after startAt", path: ["endAt"] };

export const createDepartureSchema = departureFields.refine(
  (data) => data.endAt > data.startAt,
  datesError
);

// experienceId no se puede cambiar después de crear. Si solo llega una de las dos
// fechas, la compara el service con la guardada.
export const updateDepartureSchema = departureFields
  .omit({ experienceId: true })
  .partial()
  .extend({
    status: statusSchema.optional(),
    ...cannotChange("_id", "slug", "sku", "experienceId"),
  })
  .refine(
    (data) => data.startAt === undefined || data.endAt === undefined || data.endAt > data.startAt,
    datesError
  );

// Se acepta en minúsculas y se normaliza antes de comprobar el formato
export const skuParamSchema = z.object({
  sku: z.string().trim().toUpperCase().regex(SKU_PATTERN),
});
