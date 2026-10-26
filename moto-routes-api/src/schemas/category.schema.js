import { z } from "zod";
import { cannotChange, clearable } from "./common.schema.js";

const categoryFields = z.strictObject({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional(),
});

export const createCategorySchema = categoryFields;

export const updateCategorySchema = categoryFields.partial().extend({
  ...clearable(categoryFields, "description"),
  ...cannotChange("_id", "slug"),
});
