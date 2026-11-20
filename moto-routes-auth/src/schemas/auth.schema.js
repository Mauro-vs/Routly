import { z } from "zod";
import { USER_LIMITS as LIMITS } from "../models/user.model.js";

// Las mismas reglas que la API (moto-routes-api/src/schemas/user.schema.js). Argon2 no tiene el
// límite de 72 de bcrypt; 128 deja usar frases largas y evita hashear textos enormes
export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), {
    message: "password must contain at least one letter and one number",
  });

const email = z.string().trim().toLowerCase().max(LIMITS.emailMax);

// Registro público: siempre como rider. Si llega roleId (o cualquier otro campo), 400
export const registerSchema = z.strictObject({
  name: z.string().trim().min(LIMITS.nameMin).max(LIMITS.nameMax),
  email: email.pipe(z.email()),
  password: passwordSchema,
});

// En el login no se aplican las reglas de la contraseña: solo se compara con el hash, y un 400
// diría más de lo que debe. Todo lo demás es el mismo 401
export const loginSchema = z.strictObject({
  email: email.min(1),
  password: z.string().min(1).max(128),
});

export const changePasswordSchema = z
  .strictObject({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "newPassword must be different from currentPassword",
    path: ["newPassword"],
  });
