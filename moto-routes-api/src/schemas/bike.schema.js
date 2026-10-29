import { z } from "zod";
import {
  BIKE_LIMITS as LIMITS,
  BIKE_TYPES,
  MODIFICATION_TYPES,
  maxBikeYear,
} from "../models/bike.model.js";
import { cannotChange, clearable, objectIdSchema } from "./common.schema.js";

// license no está en el esquema: lo calcula la API con la potencia y la cilindrada.
// Tampoco hay matrícula ni bastidor: no se guardan.

const modification = z.strictObject({
  type: z.enum(MODIFICATION_TYPES),
  title: z.string().trim().min(1).max(LIMITS.modificationTitleMax),
  description: z.string().trim().max(LIMITS.modificationDescriptionMax).optional(),
  // Solo el día ("2025-04-12"), y no en el futuro
  date: z.iso
    .date()
    .transform((value) => new Date(`${value}T00:00:00.000Z`))
    .refine((date) => date <= new Date(), { message: "date cannot be in the future" })
    .optional(),
});

const bikeFields = z.strictObject({
  brand: z.string().trim().min(1).max(LIMITS.brandMax),
  model: z.string().trim().min(1).max(LIMITS.modelMax),
  version: z.string().trim().max(LIMITS.versionMax).optional(),
  type: z.enum(BIKE_TYPES),
  year: z
    .number()
    .int()
    .min(LIMITS.yearMin)
    .refine((year) => year <= maxBikeYear(), { message: "year cannot be later than next year" })
    .optional(),
  cc: z.number().int().min(LIMITS.ccMin).max(LIMITS.ccMax).optional(),
  hp: z.number().positive().max(LIMITS.hpMax).optional(),
  torque: z.number().positive().max(LIMITS.torqueMax).optional(),
  weight: z.number().min(LIMITS.weightMin).max(LIMITS.weightMax).optional(),
  seatHeight: z.number().int().min(LIMITS.seatHeightMin).max(LIMITS.seatHeightMax).optional(),
  km: z.number().int().min(0).max(LIMITS.kmMax).optional(),
  color: z.string().trim().max(LIMITS.colorMax).optional(),
  nickname: z.string().trim().max(LIMITS.nicknameMax).optional(),
  // La lista entera: en un PATCH sustituye a la anterior
  modifications: z.array(modification).max(LIMITS.modificationsMax).optional(),
  // Solo se puede marcar como principal; deja de serlo al marcar otra
  isPrimary: z.literal(true).optional(),
  isPublic: z.boolean().optional(),
});

// userId: solo el admin da de alta una moto para otro usuario; si no llega, es de quien la crea
export const createBikeSchema = bikeFields.extend({
  userId: objectIdSchema.optional(),
});

const OPTIONAL = ["version", "year", "cc", "hp", "torque", "weight", "seatHeight", "km", "color", "nickname"];

export const updateBikeSchema = bikeFields.partial().extend({
  ...clearable(bikeFields, ...OPTIONAL),
  ...cannotChange("_id", "slug", "userId", "license"),
});
