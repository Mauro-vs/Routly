import { z } from "zod";
import { CATEGORY_LIMITS as LIMITS } from "../models/category.model.js";
import { defineListQuery } from "../utils/listQuery.js";
import { cannotChange, clearable } from "./common.schema.js";

const categoryFields = z.strictObject({
  name: z.string().trim().min(LIMITS.nameMin).max(LIMITS.nameMax),
  description: z.string().trim().max(LIMITS.descriptionMax).optional(),
});

export const createCategorySchema = categoryFields;

export const updateCategorySchema = categoryFields.partial().extend({
  ...clearable(categoryFields, "description"),
  ...cannotChange("_id", "slug"),
});

// Query params de GET /api/categories (utils/listQuery.js): los comunes y estos filtros
export const categoryListQuery = defineListQuery({
  sort: ["name", "createdAt", "updatedAt"],
});
