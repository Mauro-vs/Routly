import { z } from "zod";
import { IMAGE_OWNER_TYPES } from "../models/imageOwners.js";
import { objectIdSchema, statusSchema } from "./common.schema.js";

const imageUrl = z
  .string()
  .trim()
  .max(2048)
  .pipe(z.url({ protocol: /^https?$/ }));

const imageFields = z.object({
  ownerType: z.enum(IMAGE_OWNER_TYPES),
  ownerId: objectIdSchema,
  url: imageUrl,
  alt: z.string().trim().max(200).optional(),
  position: z.number().int().min(0).optional(),
  isCover: z.boolean().optional(),
});

export const createImageSchema = imageFields;

// El dueño no se puede cambiar después de crear
export const updateImageSchema = imageFields
  .omit({ ownerType: true, ownerId: true })
  .partial()
  .extend({ status: statusSchema.optional() });

// GET /api/images?ownerType=route&ownerId=<id>: los dos o ninguno
export const imageQuerySchema = z
  .object({
    ownerType: z.enum(IMAGE_OWNER_TYPES).optional(),
    ownerId: objectIdSchema.optional(),
  })
  .refine((query) => (query.ownerType === undefined) === (query.ownerId === undefined), {
    message: "ownerType and ownerId must be sent together",
    path: ["ownerType"],
  });
