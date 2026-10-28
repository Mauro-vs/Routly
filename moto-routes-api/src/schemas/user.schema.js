import { z } from "zod";
import { USER_LIMITS as LIMITS } from "../models/user.model.js";
import { cannotChange, objectIdSchema } from "./common.schema.js";
import { createProfileSchema, updateProfileSchema } from "./profile.schema.js";

// La API recibe password y guarda solo su hash (Argon2id): passwordHash nunca se acepta
// del cliente. Argon2 no tiene el límite de 72 de bcrypt; 128 deja usar frases largas y
// evita hashear textos enormes. La comparten el alta, el registro y el cambio de contraseña.
export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), {
    message: "password must contain at least one letter and one number",
  });

const userFields = z.strictObject({
  name: z.string().trim().min(LIMITS.nameMin).max(LIMITS.nameMax),
  email: z.string().trim().toLowerCase().max(LIMITS.emailMax).email(),
  password: passwordSchema,
  // Si no llega, el service asigna el rol rider
  roleId: objectIdSchema.optional(),
  // El perfil se crea siempre con el usuario; si llega, con estos datos
  profile: createProfileSchema.optional(),
});

export const createUserSchema = userFields;

export const updateUserSchema = userFields.partial().extend({
  profile: updateProfileSchema.optional(),
  ...cannotChange("_id", "slug", "passwordHash", "tokenVersion"),
});

// Lo que un usuario cambia de sí mismo (PATCH /api/profile/...): nombre, correo y perfil.
// El rol y el estado son cosa del admin; la contraseña tiene su propio endpoint.
export const updateOwnUserSchema = userFields
  .pick({ name: true, email: true })
  .partial()
  .extend({
    profile: updateProfileSchema.optional(),
    ...cannotChange("_id", "slug", "roleId", "status", "isActive", "password", "passwordHash", "tokenVersion"),
  });

export const changePasswordSchema = z
  .strictObject({
    // Solo se compara con el hash: no se le aplican las reglas de una contraseña nueva
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "newPassword must be different from currentPassword",
    path: ["newPassword"],
  });
