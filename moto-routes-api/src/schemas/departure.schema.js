import { z } from "zod";
import { DEPARTURE_LIMITS as LIMITS, DEPARTURE_STATES } from "../models/departure.model.js";
import { SKU_PATTERN } from "../utils/sku.js";
import { atLeast, atMost, defineListQuery, equals, queryDate, queryNumber } from "../utils/listQuery.js";
import { cannotChange, clearable, objectIdSchema } from "./common.schema.js";

// sku y slug no están en el esquema: los genera el service

// Solo texto ISO 8601 con hora y zona: "2026-11-08T08:00:00.000Z" o "...+01:00".
// z.coerce.date() aceptaba cualquier cosa convertible (true, 0, "2026").
const isoDate = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

const departureFields = z.strictObject({
  experienceId: objectIdSchema,
  startAt: isoDate,
  endAt: isoDate,
  capacity: z.number().int().min(1),
  // Euros por persona, con dos decimales como máximo
  price: z.number().min(0).max(LIMITS.priceMax).multipleOf(0.01),
  state: z.enum(DEPARTURE_STATES).optional(),
  // Si ese día el guía lleva otra moto (null vuelve a la de la experiencia)
  guideBikeId: objectIdSchema.optional(),
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
  .extend({ ...clearable(departureFields, "guideBikeId"), ...cannotChange("_id", "slug", "sku", "experienceId") })
  .refine(
    (data) => data.startAt === undefined || data.endAt === undefined || data.endAt > data.startAt,
    datesError
  );

// Se acepta en minúsculas y se normaliza antes de comprobar el formato
export const skuParamSchema = z.object({
  sku: z.string().trim().toUpperCase().regex(SKU_PATTERN),
});

// Query params de GET /api/departures (utils/listQuery.js): los comunes y estos filtros
export const departureListQuery = defineListQuery({
  sort: ["startAt", "price", "capacity", "createdAt", "updatedAt"],
  filters: {
    experienceId: { schema: objectIdSchema, to: equals("experienceId") },
    state: { schema: z.enum(DEPARTURE_STATES), to: equals("state") },
    // Por la fecha de inicio: ?from=2026-11-01&to=2026-11-30
    from: { schema: queryDate, to: atLeast("startAt") },
    to: { schema: queryDate, to: atMost("startAt") },
    priceMin: { schema: queryNumber.pipe(z.number().min(0)), to: atLeast("price") },
    priceMax: { schema: queryNumber.pipe(z.number().min(0)), to: atMost("price") },
  },
  ranges: [
    ["from", "to"],
    ["priceMin", "priceMax"],
  ],
});
