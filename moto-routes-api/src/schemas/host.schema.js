import { z } from "zod";
import { HOST_LIMITS as LIMITS } from "../models/host.model.js";
import { cannotChange, clearable, objectIdSchema } from "./common.schema.js";

const hostFields = z.strictObject({
  name: z.string().trim().min(LIMITS.nameMin).max(LIMITS.nameMax),
  biography: z.string().trim().max(LIMITS.biographyMax).optional(),
});

export const createHostSchema = hostFields.extend({
  userId: objectIdSchema,
});

// userId no se puede cambiar después de crear
export const updateHostSchema = hostFields.partial().extend({
  ...clearable(hostFields, "biography"),
  ...cannotChange("_id", "slug", "userId"),
});
