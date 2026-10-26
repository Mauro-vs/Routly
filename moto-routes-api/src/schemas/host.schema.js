import { z } from "zod";
import { cannotChange, clearable, objectIdSchema } from "./common.schema.js";

const hostFields = z.strictObject({
  name: z.string().trim().min(2).max(100),
  biography: z.string().trim().max(1000).optional(),
});

export const createHostSchema = hostFields.extend({
  userId: objectIdSchema,
});

// userId no se puede cambiar después de crear
export const updateHostSchema = hostFields.partial().extend({
  ...clearable(hostFields, "biography"),
  ...cannotChange("_id", "slug", "userId"),
});
