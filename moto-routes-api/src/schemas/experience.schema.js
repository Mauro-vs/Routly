import { z } from "zod";
import { cannotChange, objectIdSchema, statusSchema } from "./common.schema.js";

const experienceFields = z.object({
  hostId: objectIdSchema,
  routeId: objectIdSchema,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  meetingPoint: z.string().trim().max(200).optional(),
  language: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2}$/)
    .optional(),
  duration: z.number().min(0),
  minParticipants: z.number().int().min(1).optional(),
  maxParticipants: z.number().int().min(1).max(100),
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
  .extend({ status: statusSchema.optional(), ...cannotChange("_id", "slug") })
  .refine(
    (data) =>
      data.minParticipants === undefined ||
      data.maxParticipants === undefined ||
      data.maxParticipants >= data.minParticipants,
    participantsError
  );
