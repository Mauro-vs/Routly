import { z } from "zod";

// Un slug de la API (letras minúsculas, números y guiones), como en schemas/shop.schema.js de la API
export const slug = z
  .string()
  .trim()
  .max(200)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: "must be a slug: lowercase letters, numbers and hyphens" });

export const slugParamSchema = z.strictObject({ slug });
