import { z } from "zod";
import { ROLE_LIMITS as LIMITS, ROLE_NAME_PATTERN } from "../models/role.model.js";
import { cannotChange, clearable } from "./common.schema.js";

// isSystem no está en el esquema: solo lo fija el seed

const roleFields = z.strictObject({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .min(LIMITS.nameMin)
    .max(LIMITS.nameMax)
    .regex(ROLE_NAME_PATTERN),
  label: z.string().trim().min(LIMITS.labelMin).max(LIMITS.labelMax),
  description: z.string().trim().max(LIMITS.descriptionMax).optional(),
});

export const createRoleSchema = roleFields;

export const updateRoleSchema = roleFields.partial().extend({
  ...clearable(roleFields, "description"),
  ...cannotChange("_id", "slug", "isSystem"),
});
