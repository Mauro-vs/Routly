import { z } from "zod";
import { USER_LIMITS as LIMITS } from "../models/user.model.js";
import { cannotChange, objectIdSchema } from "./common.schema.js";

// La API recibe password y guarda solo su hash (Argon2id): passwordHash nunca se acepta
// del cliente. Argon2 no tiene el límite de 72 de bcrypt; 128 deja usar frases largas y
// evita hashear textos enormes.
const password = z
  .string()
  .min(8)
  .max(128)
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), {
    message: "password must contain at least one letter and one number",
  });

const userFields = z.strictObject({
  name: z.string().trim().min(LIMITS.nameMin).max(LIMITS.nameMax),
  email: z.string().trim().toLowerCase().max(LIMITS.emailMax).email(),
  password,
  // Si no llega, el service asigna el rol rider
  roleId: objectIdSchema.optional(),
});

export const createUserSchema = userFields;

export const updateUserSchema = userFields.partial().extend({
  ...cannotChange("_id", "slug", "passwordHash", "tokenVersion"),
});
