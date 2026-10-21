import { z } from "zod";
import { cannotChange, statusSchema } from "./common.schema.js";

// isSystem no está en el esquema: solo lo fija el seed

const roleFields = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  label: z.string().trim().min(2).max(50),
  description: z.string().trim().max(200).optional(),
});

export const createRoleSchema = roleFields;

export const updateRoleSchema = roleFields.partial().extend({
  status: statusSchema.optional(),
  ...cannotChange("_id", "slug", "isSystem"),
});
