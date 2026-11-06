import { z } from "zod";
import { IMAGE_LIMITS as LIMITS } from "../models/image.model.js";
import { IMAGE_OWNER_TYPES } from "../models/imageOwners.js";
import { defineListQuery, equals, queryBoolean } from "../utils/listQuery.js";
import { cannotChange, clearable, objectIdSchema } from "./common.schema.js";

// Solo https: el panel se sirve por https y una imagen http se bloquearía como
// contenido mixto
const imageUrl = z
  .string()
  .trim()
  .max(LIMITS.urlMax)
  .pipe(z.url({ protocol: /^https$/ }));

const imageFields = z.strictObject({
  ownerType: z.enum(IMAGE_OWNER_TYPES),
  ownerId: objectIdSchema,
  url: imageUrl,
  alt: z.string().trim().max(LIMITS.altMax).optional(),
  position: z.number().int().min(0).optional(),
  isCover: z.boolean().optional(),
});

export const createImageSchema = imageFields;

// El dueño no se puede cambiar después de crear
export const updateImageSchema = imageFields
  .omit({ ownerType: true, ownerId: true })
  .partial()
  .extend({
    ...clearable(imageFields, "alt"),
    ...cannotChange("_id", "ownerType", "ownerId"),
  });

// GET /api/images?ownerType=route&ownerId=<id>: los dos o ninguno
export const imageListQuery = defineListQuery({
  sort: ["position", "createdAt", "updatedAt"],
  filters: {
    ownerType: { schema: z.enum(IMAGE_OWNER_TYPES), to: equals("ownerType") },
    ownerId: { schema: objectIdSchema, to: equals("ownerId") },
    isCover: { schema: queryBoolean, to: equals("isCover") },
  },
  checks: [
    [
      (query) => (query.ownerType === undefined) === (query.ownerId === undefined),
      { message: "ownerType and ownerId must be sent together", path: ["ownerType"] },
    ],
  ],
});
