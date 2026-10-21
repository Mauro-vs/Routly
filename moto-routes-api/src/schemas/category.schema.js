import { z } from "zod";
import { cannotChange, statusSchema } from "./common.schema.js";

const categoryFields = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional(),
});

export const createCategorySchema = categoryFields;

export const updateCategorySchema = categoryFields.partial().extend({
  status: statusSchema.optional(),
  ...cannotChange("_id", "slug"),
});
