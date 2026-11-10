import { z } from "zod";
import { EXPERIENCE_LANGUAGES, EXPERIENCE_LIMITS as LIMITS } from "../models/experience.model.js";
import { ROUTE_DIFFICULTIES } from "../models/route.model.js";
import { atLeast, atMost, defineListQuery, equals, queryDate, queryNumber } from "../utils/listQuery.js";
import { cannotChange, clearable, objectIdSchema } from "./common.schema.js";

const experienceFields = z.strictObject({
  hostId: objectIdSchema,
  routeId: objectIdSchema,
  // La moto con la que guía: una moto activa y pública del usuario del anfitrión
  guideBikeId: objectIdSchema.optional(),
  title: z.string().trim().min(LIMITS.titleMin).max(LIMITS.titleMax),
  description: z.string().trim().max(LIMITS.descriptionMax).optional(),
  meetingPoint: z.string().trim().max(LIMITS.meetingPointMax).optional(),
  language: z.string().trim().toLowerCase().pipe(z.enum(EXPERIENCE_LANGUAGES)).optional(),
  duration: z.number().positive().max(LIMITS.durationMax),
  minParticipants: z.number().int().min(1).optional(),
  maxParticipants: z.number().int().min(1).max(LIMITS.participantsMax),
});

const participantsError = {
  message: "maxParticipants must be greater than or equal to minParticipants",
  path: ["maxParticipants"],
};

// Si minParticipants no llega vale 1, que nunca supera a maxParticipants (mínimo 1)
export const createExperienceSchema = experienceFields.refine(
  (data) => data.maxParticipants >= (data.minParticipants ?? 1),
  participantsError
);

// En el PATCH solo se comparan aquí si llegan los dos; si llega uno, lo compara el
// service con el valor guardado
export const updateExperienceSchema = experienceFields
  .partial()
  .extend({
    ...clearable(experienceFields, "description", "meetingPoint", "guideBikeId"),
    ...cannotChange("_id", "slug"),
  })
  .refine(
    (data) =>
      data.minParticipants === undefined ||
      data.maxParticipants === undefined ||
      data.maxParticipants >= data.minParticipants,
    participantsError
  );

// Query params de GET /api/experiences (utils/listQuery.js): los comunes y estos filtros
// La categoría, la ubicación y la dificultad son de la ruta (via "route"), y el precio y las
// fechas, de las salidas programadas y futuras (via "departure"): el service las resuelve con una
// consulta por colección (experience.service.js). Los de una misma colección se cumplen a la vez:
// ?priceMax=100&from=2026-12-01 es "alguna salida de 100 € o menos a partir de diciembre".
export const experienceListQuery = defineListQuery({
  // priceFrom y nextDepartureAt salen de sus salidas: el service los ordena aparte
  sort: ["title", "duration", "maxParticipants", "priceFrom", "nextDepartureAt", "createdAt", "updatedAt"],
  filters: {
    hostId: { schema: objectIdSchema, to: equals("hostId") },
    routeId: { schema: objectIdSchema, to: equals("routeId") },
    language: { schema: z.enum(EXPERIENCE_LANGUAGES), to: equals("language") },
    categoryId: { schema: objectIdSchema, to: equals("categoryId"), via: "route" },
    // De origen o de destino de su ruta
    locationId: {
      schema: objectIdSchema,
      to: (id) => ({ $or: [{ startLocationId: id }, { endLocationId: id }] }),
      via: "route",
    },
    difficulty: { schema: z.enum(ROUTE_DIFFICULTIES), to: equals("difficulty"), via: "route" },
    priceMin: { schema: queryNumber.pipe(z.number().min(0)), to: atLeast("price"), via: "departure" },
    priceMax: { schema: queryNumber.pipe(z.number().min(0)), to: atMost("price"), via: "departure" },
    from: { schema: queryDate, to: atLeast("startAt"), via: "departure" },
    to: { schema: queryDate, to: atMost("startAt"), via: "departure" },
    // Solo las que tienen alguna salida reservable (no hay "false": sería un filtro distinto)
    hasDepartures: { schema: z.literal("true").transform(() => true), to: () => ({}), via: "departure" },
  },
  ranges: [
    ["priceMin", "priceMax"],
    ["from", "to"],
  ],
});

// Cuántos elementos trae cada carrusel del Home (GET /api/shop/categories...)
export const FACETS_LIMIT = Object.freeze({ default: 12, max: 50 });
