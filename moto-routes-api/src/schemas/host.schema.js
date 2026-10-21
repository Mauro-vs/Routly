import { z } from "zod";
import { cannotChange, objectIdSchema, statusSchema } from "./common.schema.js";

const hostFields = z.object({
  name: z.string().trim().min(2).max(100),
  biography: z.string().trim().max(1000).optional(),
});

export const createHostSchema = hostFields.extend({
  userId: objectIdSchema,
});

// userId no se puede cambiar después de crear
export const updateHostSchema = hostFields.partial().extend({
  status: statusSchema.optional(),
  ...cannotChange("_id", "slug", "userId"),
});
