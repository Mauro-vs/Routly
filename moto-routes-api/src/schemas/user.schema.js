import { z } from "zod";
import { objectIdSchema, statusSchema } from "./common.schema.js";

// La API recibe password y guarda solo su hash: passwordHash nunca se acepta del cliente.
// 72 es el máximo que bcrypt tiene en cuenta.
const userFields = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().max(254).email(),
  password: z.string().min(8).max(72),
  // Si no llega, el service asigna el rol rider
  roleId: objectIdSchema.optional(),
});

export const createUserSchema = userFields;

export const updateUserSchema = userFields.partial().extend({
  status: statusSchema.optional(),
});
