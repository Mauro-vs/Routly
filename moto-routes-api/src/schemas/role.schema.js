import { z } from "zod";
import { ROLE_LIMITS as LIMITS, ROLE_NAME_PATTERN } from "../models/role.model.js";
import { defineListQuery, equals, queryBoolean } from "../utils/listQuery.js";
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

// Query params de GET /api/roles (utils/listQuery.js): los comunes y estos filtros
export const roleListQuery = defineListQuery({
  sort: ["name", "label", "createdAt", "updatedAt"],
  filters: {
    isSystem: { schema: queryBoolean, to: equals("isSystem") },
  },
});
