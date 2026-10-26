import { z } from "zod";
import { cannotChange, objectIdSchema } from "./common.schema.js";

// La API recibe password y guarda solo su hash: passwordHash nunca se acepta del cliente.
// 72 es el máximo que bcrypt tiene en cuenta.
const password = z
  .string()
  .min(8)
  .max(72)
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), {
    message: "password must contain at least one letter and one number",
  });

const userFields = z.strictObject({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().max(254).email(),
  password,
  // Si no llega, el service asigna el rol rider
  roleId: objectIdSchema.optional(),
});

export const createUserSchema = userFields;

export const updateUserSchema = userFields.partial().extend({
  ...cannotChange("_id", "slug", "passwordHash"),
});
